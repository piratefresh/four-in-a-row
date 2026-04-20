import { WordTile, type WordTileProps } from "./WordTile";

export type ScrabbleTileProps = WordTileProps;

export function ScrabbleTile(props: ScrabbleTileProps) {
  return <WordTile {...props} />;
}
