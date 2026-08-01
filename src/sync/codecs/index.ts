import { allowanceCodec } from "./allowance";
import { charactersCodec } from "./characters";
import { ddayCodec } from "./dday";
import { historyCodec } from "./history";
import { memoCodec } from "./memo";
import { tasksCodec } from "./tasks";

export const documentCodecs = {
  characters: charactersCodec,
  tasks: tasksCodec,
  dday: ddayCodec,
  memo: memoCodec,
  allowance: allowanceCodec,
  history: historyCodec,
} as const;

export type DocumentType = keyof typeof documentCodecs;
