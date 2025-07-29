import React from 'react';
import './Connection.css';
import { off } from 'process';

export const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:relay.metered.ca:80",
        },
        {
            urls: "turn:relay.metered.ca:80",
            username: "bded59281eff9f4dbbcce696",
            credential: "yEOvO7UQK43EhF0B",
        },
        {
            urls: "turn:relay.metered.ca:443",
            username: "bded59281eff9f4dbbcce696",
            credential: "yEOvO7UQK43EhF0B",
        },
        {
            urls: "turn:relay.metered.ca:443?transport=tcp",
            username: "bded59281eff9f4dbbcce696",
            credential: "yEOvO7UQK43EhF0B",
        },
    ],
};

let SERVER_CONNECTION : RTCPeerConnection | null = null;

function startServer() {

    SERVER_CONNECTION = new RTCPeerConnection(RTC_CONFIG);

    SERVER_CONNECTION.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log('New ICE candidate:', event.candidate);
        } else {
            console.log('All ICE candidates have been sent.');
        }
    });

    SERVER_CONNECTION.createOffer().then((offer) => {
        SERVER_CONNECTION!.setLocalDescription(offer);
        const offerString = JSON.stringify(offer);
        console.log('Created offer:', offerString);
        alert(offerString);
    });
}

let CLIENT_CONNECTION : RTCPeerConnection | null = null;

function connectToServer(remoteDescription: RTCSessionDescriptionInit) {
    console.log('Connecting to server');

    CLIENT_CONNECTION = new RTCPeerConnection(RTC_CONFIG);
    CLIENT_CONNECTION.setRemoteDescription(remoteDescription);

    CLIENT_CONNECTION.createAnswer().then((answer) => {
        CLIENT_CONNECTION!.setLocalDescription(answer);
        const answerString = JSON.stringify(answer);
        console.log('Created answer:', answerString);
        alert(answerString);
    });
}

function addRemoteDesciption() {
    let remoteDescriptionElement = document.getElementById('remote-description') as HTMLInputElement;
    if (!remoteDescriptionElement || !remoteDescriptionElement.value) {
        alert('Please enter a valid offer.');
        return;
    }

    let remoteDescription = JSON.parse(remoteDescriptionElement.value);

    if (SERVER_CONNECTION === null) {
        console.log("No server connection, creating client connection");
        connectToServer(remoteDescription);
        return;
    }
    else
    {
        SERVER_CONNECTION.setRemoteDescription(remoteDescription);
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
                placeholder="Enter Remote Description 2">
            </input>
            <button onClick={() => addRemoteDesciption()}>Add Remote Description</button>
        </div>
    );
}

export default Connection;
