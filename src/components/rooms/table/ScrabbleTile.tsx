import { WordTile, type WordTileProps } from "./word-tile-v2";

export type ScrabbleTileProps = WordTileProps;

export function ScrabbleTile(props: ScrabbleTileProps) {
  return <WordTile {...props} />;
}
