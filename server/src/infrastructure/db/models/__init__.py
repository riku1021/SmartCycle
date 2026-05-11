# User 等のモデルを import して Base.metadata を登録する
from .camera_detection import CameraDetection
from .device import Device
from .parking_lot import ParkingLot
from .parking_status import ParkingStatus
from .parking_status_history import ParkingStatusHistory
from .reservation import Reservation
from .user import User

__all__ = [
    "CameraDetection",
    "Device",
    "ParkingLot",
    "ParkingStatus",
    "ParkingStatusHistory",
    "Reservation",
    "User",
]
