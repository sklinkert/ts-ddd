export class CreateProductCommand {
  constructor(
    public readonly sellerId: string,
    public readonly name: string,
    public readonly priceCents: number,
    public readonly currency: string,
  ) {}
}
