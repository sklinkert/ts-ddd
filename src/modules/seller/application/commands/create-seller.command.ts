export class CreateSellerCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
  ) {}
}
