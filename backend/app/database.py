# backend/app/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:1234@mongo:27017/")
client = AsyncIOMotorClient(MONGO_URI)
db = client["network_management"]
devices_collection = db["devices"]


def serialize_device(device) -> dict:
    return {
        "id": str(device["_id"]),
        "name": device.get("name", ""),
        "ip": device.get("ip", ""),
        "brand": device.get("brand", ""),
        "status": device.get("status", "unknown"),
    }

# ฟังก์ชัน CRUD พื้นฐาน
async def insert_device(device_data: dict):
    result = await devices_collection.insert_one(device_data)
    return str(result.inserted_id)

async def find_all_devices():
    devices = []
    async for document in devices_collection.find({}):
        devices.append(serialize_device(document))
    return devices

async def find_device_by_id(device_id: str):
    document = await devices_collection.find_one({"_id": ObjectId(device_id)})
    return serialize_device(document) if document else None

async def update_device(device_id: str, update_data: dict):
    result = await devices_collection.update_one(
        {"_id": ObjectId(device_id)}, {"$set": update_data}
    )
    return result.modified_count > 0

async def delete_device(device_id: str):
    result = await devices_collection.delete_one({"_id": ObjectId(device_id)})
    return result.deleted_count > 0
