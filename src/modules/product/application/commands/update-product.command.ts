export class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly name?: string,
    public readonly priceCents?: number,
  ) {}
}
