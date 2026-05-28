export class ListSellersQuery {
  constructor(
    public readonly limit = 50,
    public readonly offset = 0,
  ) {}
}
