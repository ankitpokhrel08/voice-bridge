export interface RosterEntry {
  username: string;
  id: string;
}

export type Roster = Record<string, RosterEntry>;

export interface OfferPayload {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
}

export interface CallRejectedPayload {
  from: string;
  to: string;
}

/** Matches server.js's `caller` array shape verbatim: [from, to]. */
export type CallEndedPayload = [string, string];

export interface ServerToClientEvents {
  joined: (allusers: Roster) => void;
  offer: (payload: OfferPayload) => void;
  answer: (payload: AnswerPayload) => void;
  "call-rejected": (payload: CallRejectedPayload) => void;
  icecandidate: (candidate: RTCIceCandidateInit) => void;
  "call-ended": (caller: CallEndedPayload) => void;
}

export interface ClientToServerEvents {
  "join-user": (username: string) => void;
  offer: (payload: OfferPayload) => void;
  answer: (payload: AnswerPayload) => void;
  "call-rejected": (payload: CallRejectedPayload) => void;
  icecandidate: (candidate: RTCIceCandidateInit) => void;
  "call-ended": (caller: CallEndedPayload) => void;
}
