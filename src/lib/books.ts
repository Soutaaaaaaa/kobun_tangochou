/** 単語帳の一覧。ready: false のものは工事中（まだ単語データがない） */
export type Book = { id: string; name: string; sub: string; ready: boolean };

export const BOOKS: Book[] = [
  { id: "kobun400", name: "古文単語400", sub: "古文", ready: true },
  { id: "kobun315", name: "古文単語315", sub: "古文", ready: true },
  { id: "kanbun", name: "体系漢文", sub: "漢文", ready: false },
];
