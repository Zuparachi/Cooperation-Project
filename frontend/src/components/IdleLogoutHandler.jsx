import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function IdleLogoutHandler({
  timeout = 3 * 60 * 1000,
  warningTime = 60 * 1000,
}) {
  const navigate = useNavigate();

  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    navigate("/login");
  };

  const resetTimer = () => {
    if (!localStorage.getItem("token")) return;

    clearTimeout(timerRef.current);
    clearTimeout(warningTimerRef.current);

    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, timeout - warningTime);

    timerRef.current = setTimeout(() => {
      logout();
    }, timeout);
  };

  const continueSession = () => {
    setShowWarning(false);
    resetTimer();
  };

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      clearTimeout(timerRef.current);
      clearTimeout(warningTimerRef.current);
    };
  }, []);

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[350px] text-center">
            <h2 className="text-lg font-semibold mb-3">
              Session Expiring Soon
            </h2>

            <p className="text-gray-600 mb-4">
              You will be logged out in 1 minute due to inactivity.
            </p>

            <button
              onClick={continueSession}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Continue Session
            </button>
          </div>
        </div>
      )}
    </>
  );
}