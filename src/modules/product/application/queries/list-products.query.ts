export class ListProductsQuery {
  constructor(
    public readonly sellerId?: string,
    public readonly limit = 50,
    public readonly offset = 0,
  ) {}
}
