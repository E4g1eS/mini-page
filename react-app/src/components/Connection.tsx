import React from "react";
import "./Connection.css";

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:relay.metered.ca:80",
    },
    {
      urls: "stun:stun.l.google.com:19302",
    },
    // {
    //     urls: "turn:relay.metered.ca:80",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
    // {
    //     urls: "turn:relay.metered.ca:443",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
    // {
    //     urls: "turn:relay.metered.ca:443?transport=tcp",
    //     username: "bded59281eff9f4dbbcce696",
    //     credential: "yEOvO7UQK43EhF0B",
    // },
  ],
};

function logConnectionState(connection: RTCPeerConnection) {
  const DO = true;
  if (!DO) return;

  console.log(
    `Connection state: ${connection.connectionState}, ICE connection state: ${connection.iceConnectionState}`
  );
}

let DATA_CHANNEL = null as RTCDataChannel | null;

let SERVER_CONNECTION: RTCPeerConnection | null = null;

function startServer() {
  SERVER_CONNECTION = new RTCPeerConnection(RTC_CONFIG);

  SERVER_CONNECTION.addEventListener("connectionstatechange", () => {
    console.log(
      `Server connection state changed: ${SERVER_CONNECTION?.connectionState}`
    );
  });

  SERVER_CONNECTION.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", JSON.stringify(event.candidate));
    } else {
      console.log("All ICE candidates have been sent.");
    }
  });

  logConnectionState(SERVER_CONNECTION);

  DATA_CHANNEL = SERVER_CONNECTION.createDataChannel("binaryData", {
    ordered: false, // Ensures messages are delivered in order
  });

  SERVER_CONNECTION.createOffer()
    .then((offer) => {
      SERVER_CONNECTION!.setLocalDescription(offer).then(
        () => {
          console.log("Local description set successfully.");
        },
        (error) => {
          console.error("Error setting local description:", error);
        }
      );
      logConnectionState(SERVER_CONNECTION!);
      const offerString = JSON.stringify(offer);
      console.log("Created offer:", offerString);
      alert(offerString);
    })
    .catch((error) => {
      console.error("Error creating offer:", error);
    });

  console.log("Creating data channel...");

  logConnectionState(SERVER_CONNECTION!);

  DATA_CHANNEL.addEventListener("open", () => {
    console.log("Data channel is open. Sending initial message...");
    DATA_CHANNEL!.send("Hello from the server!");
  });

  logConnectionState(SERVER_CONNECTION!);
}

let CLIENT_CONNECTION: RTCPeerConnection | null = null;

function connectToServer(remoteDescription: RTCSessionDescriptionInit) {
  console.log("Connecting to server");

  CLIENT_CONNECTION = new RTCPeerConnection(RTC_CONFIG);

  CLIENT_CONNECTION.addEventListener("connectionstatechange", () => {
    console.log(
      `Server connection state changed: ${SERVER_CONNECTION?.connectionState}`
    );
  });

  CLIENT_CONNECTION.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", JSON.stringify(event.candidate));
    } else {
      console.log("All ICE candidates have been sent.");
    }
  });

  CLIENT_CONNECTION.setRemoteDescription(remoteDescription).catch((error) => {
    console.error("Error setting remote description:", error);
  });

  CLIENT_CONNECTION.createAnswer().then((answer) => {
    CLIENT_CONNECTION!.setLocalDescription(answer).catch((error) => {
      console.error("Error setting local description:", error);
    });
    const answerString = JSON.stringify(answer);
    console.log("Created answer:", answerString);
    alert(answerString);
  });

  CLIENT_CONNECTION.addEventListener("datachannel", (event) => {
    console.log("Data channel received from server:", event.channel);
    DATA_CHANNEL = event.channel;
    DATA_CHANNEL.addEventListener("message", (event) => {
      console.log("Received message:", event.data);
    });
  });
}

function addRemoteDesciption() {
  let remoteDescriptionElement = document.getElementById(
    "remote-description"
  ) as HTMLInputElement;
  if (!remoteDescriptionElement || !remoteDescriptionElement.value) {
    alert("Please enter a valid offer.");
    return;
  }

  let remoteDescription = JSON.parse(remoteDescriptionElement.value);

  if (SERVER_CONNECTION === null) {
    console.log("No server connection, creating client connection");
    connectToServer(remoteDescription);
    logConnectionState(CLIENT_CONNECTION!);
    return;
  } else {
    SERVER_CONNECTION.setRemoteDescription(remoteDescription).catch((error) => {
      console.error("Error setting remote description:", error);
    });
    logConnectionState(SERVER_CONNECTION);
    console.log("Set remote desciption");
  }
}

function Connection() {
  return (
    <div className="Connection">
      <button onClick={() => startServer()}>Start Server</button>
      <input
        id="remote-description"
        type="text"
        placeholder="Enter Remote Description 2"
      ></input>
      <button onClick={() => addRemoteDesciption()}>
        Add Remote Description
      </button>
    </div>
  );
}

export default Connection;
