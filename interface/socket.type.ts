import { Socket } from "socket.io";
import { JwtPayload } from "jsonwebtoken";

export interface DecodedToken extends JwtPayload {
  userId: string;
  username?: string;
  role?: string;
}

export interface SocketAuth {
  token?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: DecodedToken;
}
