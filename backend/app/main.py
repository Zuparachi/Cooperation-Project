from fastapi import FastAPI, HTTPException, Request, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import os
import traceback
import asyncio
import platform

load_dotenv()
# ------------------------------------------
# MongoDB Connection
# ------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:1234@mongo:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "network_management")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DATABASE_NAME]


# ------------------------------------------
# JWT / Password
# ------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ------------------------------------------
# FastAPI Init
# ------------------------------------------
app = FastAPI(title="Network Manager API")


# ------------------------------------------
# Models
# ------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str  # admin | user


class Site(BaseModel):
    site_name: str
    date_modify: str
    job_number: str


class Building(BaseModel):
    name: str
    parent_id: str
    parent_type: str = "site"


class Floor(BaseModel):
    name: str
    parent_id: str
    parent_type: str = "building"


class Node(BaseModel):
    name: str
    ip: str
    subnet: Optional[str] = None
    brand: str
    model: str
    device_type: str
    status: str = "offline"
    parent_type: str
    parent_id: str
    x: Optional[float] = 0
    y: Optional[float] = 0


class Edge(BaseModel):
    source: str
    target: str
    parent_type: str
    parent_id: str
    label: Optional[str] = ""


class PacketHop(BaseModel):
    from_node_id: str
    to_node_id: str
    from_name: str
    to_name: str
    to_ip: str
    ping_ok: bool
    ping_output: str


class PacketTestResult(BaseModel):
    ok: bool
    source_id: str
    target_id: str
    source_name: str
    target_name: str
    path_node_ids: List[str]
    hops: List[PacketHop]


# ------------------------------------------
# Helpers
# ------------------------------------------
def utcnow():
    return datetime.now(timezone.utc)


def serialize_doc(doc: dict):
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc


def normalize_device_type(v: str) -> str:
    return (v or "").strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_all_nodes_in_site(site_id: str):
    site_nodes = await db.nodes.find({
        "parent_type": "site",
        "parent_id": site_id
    }).to_list(None)

    buildings = await db.buildings.find({
        "parent_type": "site",
        "parent_id": site_id
    }).to_list(None)

    building_ids = [str(b["_id"]) for b in buildings]

    building_nodes = []
    if building_ids:
        building_nodes = await db.nodes.find({
            "parent_type": "building",
            "parent_id": {"$in": building_ids}
        }).to_list(None)

    floors = []
    if building_ids:
        floors = await db.floors.find({
            "parent_type": "building",
            "parent_id": {"$in": building_ids}
        }).to_list(None)

    floor_ids = [str(f["_id"]) for f in floors]

    floor_nodes = []
    if floor_ids:
        floor_nodes = await db.nodes.find({
            "parent_type": "floor",
            "parent_id": {"$in": floor_ids}
        }).to_list(None)

    return site_nodes + building_nodes + floor_nodes

async def authenticate_user(username: str, password: str):
    user = await db.users.find_one({"username": username})
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return user


async def write_audit_log(db, username: str, action: str, request: Request):
    await db.audit_logs.insert_one({
        "username": username,
        "action": action,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "timestamp": utcnow()
    })


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def ping_ip(ip: str, count: int = 2, timeout: int = 3) -> tuple[bool, str]:
    system = platform.system().lower()
    count_flag = "-n" if "windows" in system else "-c"
    timeout_flag = "-w" if "windows" in system else "-W"

    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", count_flag, str(count), timeout_flag, str(timeout), ip,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        out = (stdout + stderr).decode(errors="ignore")
        ok = proc.returncode == 0
        return ok, out
    except FileNotFoundError:
        return False, "ping command not found in backend container"
    except Exception as e:
        return False, f"ping error: {e}"


async def mark_node_online(node_id: str):
    await db.nodes.update_one(
        {"_id": ObjectId(node_id)},
        {"$set": {
            "status": "online",
            "last_seen": utcnow()
        }}
    )

async def find_path_between_nodes(db, parent_type: str, parent_id: str, source_id: str, target_id: str) -> Optional[List[str]]:
    edges_cursor = db.edges.find({
        "parent_type": parent_type,
        "parent_id": parent_id,
    })
    edges = []
    async for e in edges_cursor:
        edges.append(e)

    adj: Dict[str, List[str]] = {}

    def add_edge(a, b):
        if a not in adj:
            adj[a] = []
        adj[a].append(b)

    for e in edges:
        s = e.get("source")
        t = e.get("target")
        if not s or not t:
            continue
        add_edge(s, t)
        add_edge(t, s)

    if source_id not in adj or target_id not in adj:
        return None

    from collections import deque
    q = deque([source_id])
    visited = {source_id}
    parent: Dict[str, str] = {}

    while q:
        cur = q.popleft()
        if cur == target_id:
            break
        for nxt in adj.get(cur, []):
            if nxt not in visited:
                visited.add(nxt)
                parent[nxt] = cur
                q.append(nxt)

    if target_id not in visited:
        return None

    path = []
    cur = target_id
    while True:
        path.append(cur)
        if cur == source_id:
            break
        cur = parent[cur]
    path.reverse()
    return path


def _oid(v: Any) -> str:
    try:
        if isinstance(v, ObjectId):
            return str(v)
    except Exception:
        pass
    if isinstance(v, dict) and "$oid" in v:
        return str(v["$oid"])
    return str(v)


# ------------------------------------------
# Auto Monitor Loop
# ------------------------------------------
semaphore = asyncio.Semaphore(20)

async def auto_monitor_loop():
    print("🚀 Auto Monitor Start...")

    while True:
        try:
            nodes = await db.nodes.find({}).to_list(None)

            async def check_node(node):
                async with semaphore:
                    ip = node.get("ip")
                    if not ip:
                        return

                    ok, _ = await ping_ip(ip)

                    await db.nodes.update_one(
                        {"_id": node["_id"]},
                        {"$set": {"status": "online" if ok else "offline"}}
                    )

            await asyncio.gather(*(check_node(n) for n in nodes))

        except Exception as e:
            print("❌ Monitor error:", e)

        await asyncio.sleep(10)


# ------------------------------------------
# Exception Logger
# ------------------------------------------
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("🔥 ERROR:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})


# ------------------------------------------
# Startup
# ------------------------------------------
# @app.on_event("startup")
# async def startup_event():
#     asyncio.create_task(auto_monitor_loop())


# ------------------------------------------
# Routes
# ------------------------------------------
@app.get("/")
def root():
    return {"message": "Backend connected successfully"}


# ---------- Auth ----------
@app.post("/login")
async def login(form: LoginRequest, request: Request):
    user = await authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await write_audit_log(
        db,
        username=form.username,
        action="login",
        request=request
    )

    access_token = create_token({
        "sub": user["username"],
        "role": user.get("role", "user")
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.get("role", "user")
    }


# ---------- Admin Management ----------
@app.get("/admin/users")
async def list_users(admin=Depends(get_current_admin)):
    users = []
    async for u in db.users.find({}):
        users.append({
            "id": str(u["_id"]),
            "username": u.get("username"),
            "role": u.get("role", "user")
        })
    return users


@app.post("/admin/users")
async def create_user(body: CreateUserRequest, admin=Depends(get_current_admin)):
    if body.role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = await db.users.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = hash_password(body.password)

    result = await db.users.insert_one({
        "username": body.username,
        "password": hashed_password,
        "role": body.role
    })

    return {
        "id": str(result.inserted_id),
        "username": body.username,
        "role": body.role
    }


@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(get_current_admin)):
    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if admin["sub"] == target_user.get("username"):
        raise HTTPException(status_code=400, detail="Cannot delete current login user")

    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}


# ---------- Touch Site ----------
@app.post("/sites/{site_id}/touch")
async def touch_site(site_id: str, request: Request, user=Depends(get_current_user)):
    now = utcnow()
    username = user.get("sub", "unknown")

    result = await db.sites.update_one(
        {"_id": ObjectId(site_id)},
        {"$set": {
            "recent_editor": username,
            "last_update": now,
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Site not found")

    return {
        "ok": True,
        "site_id": site_id,
        "recent_editor": username,
        "last_update": now.isoformat()
    }


# ---------- Dashboard ----------
@app.get("/dashboard/summary")
async def dashboard_summary():
    site_count = await db.sites.count_documents({})
    devices = await db.nodes.find({}).to_list(None)

    device_count = len(devices)
    online = len([d for d in devices if d.get("status") == "online"])
    offline = len([d for d in devices if d.get("status") == "offline"])

    return {
        "sites": site_count,
        "devices": device_count,
        "online": online,
        "offline": offline,
    }


@app.get("/dashboard/device-status")
async def dashboard_device_status():
    devices = await db.nodes.find({}).to_list(None)

    result = {
        "router": {"online": 0, "offline": 0},
        "switch": {"online": 0, "offline": 0},
        "pc": {"online": 0, "offline": 0},
        "ap": {"online": 0, "offline": 0},
    }

    for d in devices:
        dtype = normalize_device_type(d.get("device_type"))
        status = (d.get("status") or "offline").lower()

        if dtype in result:
            if status == "online":
                result[dtype]["online"] += 1
            else:
                result[dtype]["offline"] += 1

    return result


@app.get("/dashboard/site-summary")
async def dashboard_site_summary():
    sites = await db.sites.find({}).to_list(None)
    results = []

    for s in sites:
        site_id = str(s["_id"])

        # ดึง node ทั้งหมดใน site นี้จริง ๆ
        nodes = await get_all_nodes_in_site(site_id)

        def count_type(device_type: str):
            total = sum(
                1 for n in nodes
                if normalize_device_type(n.get("device_type")) == device_type
            )
            online = sum(
                1 for n in nodes
                if normalize_device_type(n.get("device_type")) == device_type
                and (n.get("status") or "").lower() == "online"
            )
            return online, total

        def get_down_list(device_type: str):
            return [
                n.get("name", "-")
                for n in nodes
                if normalize_device_type(n.get("device_type")) == device_type
                and (n.get("status") or "").lower() == "offline"
            ]

        router_online, router_total = count_type("router")
        switch_online, switch_total = count_type("switch")
        ap_online, ap_total = count_type("ap")
        pc_online, pc_total = count_type("pc")

        router_down_list = get_down_list("router")
        switch_down_list = get_down_list("switch")
        ap_down_list = get_down_list("ap")
        pc_down_list = get_down_list("pc")

        last_update = s.get("last_update") or s.get("date_modify") or "-"
        recent_editor = s.get("recent_editor") or "-"

        if isinstance(last_update, datetime):
            last_update = last_update.isoformat()

        results.append({
            "site_id": site_id,
            "site_name": s.get("site_name"),

            "router_online": router_online,
            "router_total": router_total,

            "switch_online": switch_online,
            "switch_total": switch_total,

            "ap_online": ap_online,
            "ap_total": ap_total,

            "pc_online": pc_online,
            "pc_total": pc_total,

            "router_down_list": router_down_list,
            "switch_down_list": switch_down_list,
            "ap_down_list": ap_down_list,
            "pc_down_list": pc_down_list,

            "recent_editor": recent_editor,
            "last_update": last_update,
        })

    return results


# ---------- Sites ----------
@app.get("/sites")
async def get_sites():
    sites = []
    async for doc in db.sites.find({}):
        sites.append(serialize_doc(doc))
    return sites


@app.post("/sites")
async def create_site(site: Site):
    result = await db.sites.insert_one(site.dict())
    new_site = await db.sites.find_one({"_id": result.inserted_id})
    return serialize_doc(new_site)


@app.get("/sites/{site_id}")
async def get_site(site_id: str):
    site = await db.sites.find_one({"_id": ObjectId(site_id)})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return serialize_doc(site)


@app.delete("/sites/{site_id}")
async def delete_site(site_id: str):
    site_oid = ObjectId(site_id)

    buildings = await db.buildings.find({"parent_id": site_id}).to_list(None)
    building_ids = [str(b["_id"]) for b in buildings]

    floors = await db.floors.find({"parent_id": {"$in": building_ids}}).to_list(None)
    floor_ids = [str(f["_id"]) for f in floors]

    await db.edges.delete_many({
        "parent_id": {"$in": [site_id] + building_ids + floor_ids}
    })
    await db.nodes.delete_many({
        "parent_id": {"$in": [site_id] + building_ids + floor_ids}
    })
    await db.floors.delete_many({"parent_id": {"$in": building_ids}})
    await db.buildings.delete_many({"parent_id": site_id})
    await db.sites.delete_one({"_id": site_oid})

    return {"message": "Site deleted successfully"}


# ---------- Buildings ----------
@app.post("/sites/{site_id}/buildings")
async def create_building(site_id: str, building: dict):
    data = {
        "name": building["name"],
        "parent_type": "site",
        "parent_id": site_id
    }
    result = await db.buildings.insert_one(data)
    new_building = await db.buildings.find_one({"_id": result.inserted_id})
    return serialize_doc(new_building)


@app.get("/sites/{site_id}/buildings")
async def get_buildings(site_id: str):
    buildings = []
    async for b in db.buildings.find({"parent_id": site_id, "parent_type": "site"}):
        b["_id"] = str(b["_id"])
        b["floor_count"] = await db.floors.count_documents({"parent_id": b["_id"]})
        b["node_count"] = await db.nodes.count_documents({"parent_type": "building", "parent_id": b["_id"]})
        buildings.append(b)
    return buildings


@app.delete("/buildings/{building_id}")
async def delete_building(building_id: str):
    result = await db.buildings.delete_one({"_id": ObjectId(building_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")

    await db.floors.delete_many({"parent_id": building_id})
    return {"message": "Building deleted successfully"}


# ---------- Floors ----------
@app.post("/buildings/{building_id}/floors")
async def create_floor(building_id: str, floor: dict):
    data = {
        "name": floor["name"],
        "parent_type": "building",
        "parent_id": building_id
    }
    result = await db.floors.insert_one(data)
    new_floor = await db.floors.find_one({"_id": result.inserted_id})
    return serialize_doc(new_floor)


@app.get("/buildings/{building_id}/floors")
async def get_floors(building_id: str):
    floors = []
    async for f in db.floors.find({"parent_id": building_id, "parent_type": "building"}):
        floors.append(serialize_doc(f))
    return floors


@app.delete("/floors/{floor_id}")
async def delete_floor(floor_id: str):
    result = await db.floors.delete_one({"_id": ObjectId(floor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Floor not found")

    await db.nodes.delete_many({"parent_id": floor_id})
    return {"message": "Floor deleted successfully"}


# ---------- Nodes ----------
@app.post("/nodes")
async def create_node(node: Node):
    result = await db.nodes.insert_one(node.dict())
    new_node = await db.nodes.find_one({"_id": result.inserted_id})
    return serialize_doc(new_node)


@app.get("/nodes")
async def get_nodes(parent_type: str = Query(...), parent_id: str = Query(...)):
    nodes = []
    async for n in db.nodes.find({"parent_type": parent_type, "parent_id": parent_id}):
        nodes.append(serialize_doc(n))
    return nodes


@app.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    result = await db.nodes.delete_one({"_id": ObjectId(node_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found")

    await db.edges.delete_many({"$or": [{"source": node_id}, {"target": node_id}]})
    return {"message": "Node deleted successfully"}


@app.patch("/nodes/{node_id}/position")
async def update_node_position(node_id: str, body: dict):
    x = body.get("x")
    y = body.get("y")

    if x is None or y is None:
        raise HTTPException(status_code=400, detail="Missing x/y")

    await db.nodes.update_one(
        {"_id": ObjectId(node_id)},
        {"$set": {"x": x, "y": y}}
    )

    return {"status": "ok", "x": x, "y": y}


# ---------- Edges ----------
@app.post("/edges")
async def create_edge(edge: dict):
    try:
        data = {
            "source": _oid(edge.get("source")),
            "target": _oid(edge.get("target")),
            "parent_type": edge.get("parent_type"),
            "parent_id": _oid(edge.get("parent_id")),
            "label": edge.get("label", ""),
        }
        result = await db.edges.insert_one(data)
        new_edge = await db.edges.find_one({"_id": result.inserted_id})
        return serialize_doc(new_edge)
    except Exception as e:
        print("🔥 Error creating edge:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/edges")
async def get_edges(parent_type: str, parent_id: str):
    edges = []
    async for e in db.edges.find({"parent_type": parent_type, "parent_id": parent_id}):
        edges.append(serialize_doc(e))
    return edges


@app.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str):
    result = await db.edges.delete_one({"_id": ObjectId(edge_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Edge not found")
    return {"message": "Edge deleted successfully"}


@app.delete("/edges/node/{node_id}")
async def delete_edges_of_node(node_id: str):
    result = await db.edges.delete_many({"$or": [{"source": node_id}, {"target": node_id}]})
    return {"deleted": result.deleted_count}


# ---------- Packet Test ----------
@app.get("/packet-test", response_model=PacketTestResult)
async def packet_test(
    source_id: str = Query(..., description="Node ID ต้นทาง"),
    target_id: str = Query(..., description="Node ID ปลายทาง"),
    parent_type: str = Query(..., description="site/building/floor"),
    parent_id: str = Query(..., description="ID ของ context ปัจจุบัน"),
):
    path = await find_path_between_nodes(db, parent_type, parent_id, source_id, target_id)

    if not path:
        src_doc = await db.nodes.find_one({"_id": ObjectId(source_id)})
        tgt_doc = await db.nodes.find_one({"_id": ObjectId(target_id)})

        return PacketTestResult(
            ok=False,
            source_id=source_id,
            target_id=target_id,
            source_name=src_doc.get("name") if src_doc else source_id,
            target_name=tgt_doc.get("name") if tgt_doc else target_id,
            path_node_ids=[],
            hops=[],
        )

    node_docs: Dict[str, Dict[str, Any]] = {}
    cursor = db.nodes.find({"_id": {"$in": [ObjectId(nid) for nid in path]}})
    async for doc in cursor:
        node_docs[str(doc["_id"])] = doc

    src_doc = node_docs.get(source_id) or await db.nodes.find_one({"_id": ObjectId(source_id)})
    tgt_doc = node_docs.get(target_id) or await db.nodes.find_one({"_id": ObjectId(target_id)})

    hops: List[PacketHop] = []

    for i in range(1, len(path)):
        from_id = path[i - 1]
        to_id = path[i]

        from_doc = node_docs.get(from_id) or await db.nodes.find_one({"_id": ObjectId(from_id)})
        to_doc = node_docs.get(to_id) or await db.nodes.find_one({"_id": ObjectId(to_id)})

        from_name = from_doc.get("name") if from_doc else from_id
        to_name = to_doc.get("name") if to_doc else to_id
        to_ip = to_doc.get("ip") if to_doc else None

        if not to_ip:
            hops.append(PacketHop(
                from_node_id=from_id,
                to_node_id=to_id,
                from_name=from_name,
                to_name=to_name,
                to_ip="",
                ping_ok=False,
                ping_output="No IP configured for this node",
            ))
            continue

        ok, out = await ping_ip(to_ip)

        if ok:
            await db.nodes.update_one(
                {"_id": ObjectId(to_id)},
                {"$set": {"status": "online"}}
            )

        hops.append(PacketHop(
            from_node_id=from_id,
            to_node_id=to_id,
            from_name=from_name,
            to_name=to_name,
            to_ip=to_ip,
            ping_ok=ok,
            ping_output=out,
        ))

    overall_ok = all(h.ping_ok for h in hops) if hops else False

    if overall_ok:
        await mark_node_online(target_id)

    return PacketTestResult(
        ok=overall_ok,
        source_id=source_id,
        target_id=target_id,
        source_name=src_doc.get("name") if src_doc else source_id,
        target_name=tgt_doc.get("name") if tgt_doc else target_id,
        path_node_ids=path,
        hops=hops,
    )

# ------------------------------------------
# PROBE API
# ------------------------------------------

class ProbeStatusItem(BaseModel):
    node_id: str
    status: str

class ProbeBatchUpdate(BaseModel):
    items: List[ProbeStatusItem]


@app.get("/probe/nodes")
async def get_probe_nodes():
    """
    ให้ probe agent ดึงรายการ node ที่ต้องตรวจ
    ยกเว้น device_type = pc
    """
    nodes = await db.nodes.find({"device_type": {"$ne": "pc"}}).to_list(None)

    result = []
    for n in nodes:
        result.append({
            "id": str(n["_id"]),
            "name": n.get("name"),
            "ip": n.get("ip"),
            "device_type": n.get("device_type"),
        })

    return result


@app.post("/probe/update-batch")
async def update_probe_batch(body: ProbeBatchUpdate):
    """
    รับผลการตรวจจาก probe แล้ว update MongoDB
    """
    now = datetime.utcnow()

    for item in body.items:
        await db.nodes.update_one(
            {"_id": ObjectId(item.node_id)},
            {
                "$set": {
                    "status": item.status,
                    "last_seen": now
                }
            }
        )

    return {"ok": True, "updated": len(body.items)}

# ------------------------------------------
# CORS
# ------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)