from fastapi import FastAPI
import json

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

class Connection:
    host_name: str
    offer: dict
    host_ice_candidates: list[dict] = []

    client_name: str | None = None
    answer: dict | None = None
    client_ice_candidates: list[dict] = []

    def __init__(self, host_name: str, offer: dict):
        self.host_name = host_name
        self.offer = offer
        self.client_name = generate_client_name(host_name)

    def generate_client_name(self) -> str:
        """
        Generate a client name based on the host name.
        """
        return f"{self.host_name}_client"

CONNECTIONS: list[Connection] = list()

@app.post("/webrtc")
async def webrtc_handler(data: dict):

    print("Received WebRTC data:", data)

    message_type = data.get("messageType")
    assert message_type is not None, "Missing 'messageType' field in WebRTC data"

    peer_name = data.get("peerName")
    assert host_name is not None, "Missing 'peerName' field in WebRTC data"

    match message_type:
        case "offer":
            offer = data.get("offer")
            assert offer is not None, "Missing 'offer' field in WebRTC data"
            connection = Connection(
                host_name=peer_name,
                offer=offer
            )
            CONNECTIONS.append(connection)
            return {"success": True, "clientName": connection.client_name}

        case "answer":
            answer = data.get("answer")
            assert answer is not None, "Missing 'answer' field in WebRTC data"
            
            for connection in CONNECTIONS:
                if connection.host_name == peer_name:
                    connection.answer = answer
                    return {"success": True}

            return {"success": False, "error": "Host not found"}

        case "candidate":
            ice_candidate = data.get("candidate")
            assert ice_candidate is not None, "Missing 'candidate' field in WebRTC data"

            # ICE candidates are set for self --> so either client name or host name

            for connection in CONNECTIONS:
                if connection.host_name == peer_name:
                    connection.host_ice_candidates.append(ice_candidate)
                    return {"success": True}
                elif connection.client_name == peer_name:
                    connection.client_ice_candidates.append(ice_candidate)
                    return {"success": True}

        case _:
            return {"success": False, "error": "Unknown WebRTC message type"}

    return {"success": False}

@app.get("/webrtc/ice_candidates")
async def get_ice_candidates(data: dict):
    # Either from host or client
    peer_name = data.get("peerName")
    assert peer_name is not None, "Missing 'peerName' field in WebRTC data"

    for connection in CONNECTIONS:
        if connection.host_name == peer_name:
            ice_candidates = connection.host_ice_candidates
            connection.host_ice_candidates = list()  # Clear after fetching
            return {"success": True, "iceCandidates": ice_candidates}
        elif connection.client_name == peer_name:
            ice_candidates = connection.client_ice_candidates
            connection.client_ice_candidates = list()  # Clear after fetching
            return {"success": True, "iceCandidates": ice_candidates}

    return {"sucess": False, "error": "Peer not found"}

@app.get("/webrtc/offer")
async def get_offer(data: dict):
    peer_name = data.get("peerName")
    assert peer_name is not None, "Missing 'peerName' field in WebRTC data"

    for connection in CONNECTIONS:
        if connection.host_name == peer_name:
            return {"success": True, "offer": connection.offer}

    return {"success": False, "error": "Peer not found"}

@app.get("/webrtc/answer")
async def get_answer(data: dict):
    peer_name = data.get("peerName")
    assert peer_name is not None, "Missing 'peerName' field in WebRTC data"

    for connection in CONNECTIONS:
        if connection.client_name == peer_name:
            return {"success": True, "answer": connection.answer}

    return {"success": False, "error": "Peer not found"}
