import React from "react";

import { PeerType } from "./peer";

export interface ConnectionContextType {
    peer: PeerType,
    setPeer: React.Dispatch<React.SetStateAction<PeerType>>
}

export const ConnectionContext = React.createContext<ConnectionContextType>({peer: null, setPeer: () => {}});
