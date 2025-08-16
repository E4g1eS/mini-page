from fastapi import FastAPI, Header
from pydantic import BaseModel
from enum import Enum, IntEnum
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

ORIGINS = [
    "http://localhost:3000",
    # You can add other origins here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,           # Allow only this origin(s)
    allow_credentials=True,
    allow_methods=["*"],             # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],             # Allow all headers
)

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

def return_error(message: str):
    return {"success": False, "error": message}

def return_success(data: dict | None = None):
    if data is None:
        data = {}
    return {"success": True, **data}

class Connection:
    host_name: str
    offer: dict
    host_ice_candidates: list[str] = []

    client_name: str | None = None
    answer: dict | None = None
    client_ice_candidates: list[str] = []

    def __init__(self, host_name: str, offer: str):
        self.host_name = host_name
        self.offer = offer
        self.client_name = self.generate_client_name()

    def __str__(self):
        return json.dumps(self.__dict__)

    def generate_client_name(self) -> str:
        """
        Generate a client name based on the host name.
        """
        return f"{self.host_name}_client"

CONNECTIONS: list[Connection] = list()

@app.get("/reset")
async def reset():
    global CONNECTIONS
    CONNECTIONS = list()  # Reset the connections list
    return return_success({"message": "Resetting connections."})

@app.get("/data")
async def data():
    return return_success({"message": [connection for connection in CONNECTIONS]})

class MessageType(str, Enum):
    offer = 'offer'
    answer = 'answer'
    ice_candidate = "candidate"

class WebRTCData(BaseModel):
    messageType: MessageType
    peerName: str
    payload: str

@app.post("/webrtc")
async def webrtc_handler(data: WebRTCData):

    print("Received WebRTC data:", data)

    match data.messageType.value:
        case MessageType.offer:
            connection = Connection(
                host_name=data.peerName,
                offer=data.payload
            )
            CONNECTIONS.append(connection)
            return return_success({"clientName": connection.client_name})

        case MessageType.answer:
            for connection in CONNECTIONS:
                if connection.host_name == data.peerName:
                    connection.answer = data.payload
                    return return_success()

            return return_error("Host not found")

        case MessageType.ice_candidate:
            # ICE candidates are set for self --> so either client name or host name
            for connection in CONNECTIONS:
                if connection.host_name == data.peerName:
                    connection.host_ice_candidates.append(data.payload)
                    return return_success()
                elif connection.client_name == data.peerName:
                    connection.client_ice_candidates.append(data.payload)
                    return return_success()

        case _:
            return return_error("Unknown message type")

    # This should never happen
    return return_error("Unknown message type")

@app.get("/webrtc/ice_candidates")
async def get_ice_candidates(peerName: str = Header(None)):
    if peerName is None:
        return return_error("Missing 'peer-name' header in WebRTC request")

    for connection in CONNECTIONS:
        if connection.host_name == peerName:
            ice_candidates = connection.host_ice_candidates
            connection.host_ice_candidates = list()  # Clear after fetching
            return return_success({"candidates": ice_candidates})
        elif connection.client_name == peerName:
            ice_candidates = connection.client_ice_candidates
            connection.client_ice_candidates = list()  # Clear after fetching
            return return_success({"candidates": ice_candidates})

    return return_error("Peer not found")

@app.get("/webrtc/offer")
async def get_offer(peerName: str = Header(None)):
    if peerName is None:
        return return_error("Missing 'peer-name' header in WebRTC request")

    for connection in CONNECTIONS:
        if connection.host_name == peerName:
            return return_success({"offer": connection.offer, "clientName": connection.client_name})

    return return_error("Host not found")

@app.get("/webrtc/answer")
async def get_answer(peerName: str = Header(None)):
    if peerName is None:
        return return_error("Missing 'peer-name' header in WebRTC request")

    for connection in CONNECTIONS:
        if connection.client_name == peerName:
            if connection.answer is not None:
                return return_success({"answer": connection.answer})
            else:
                return return_error("Client not connected yet")

    return return_error("Client not found")
