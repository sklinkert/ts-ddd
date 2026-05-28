export class RenameSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly name: string,
  ) {}
}
