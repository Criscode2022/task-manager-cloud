import { IsString, Matches } from 'class-validator';
import { PIN_LENGTH } from '../pin.util';

export class PinDto {
  @IsString()
  @Matches(new RegExp(`^\\d{${PIN_LENGTH}}$`), {
    message: `pin must be exactly ${PIN_LENGTH} digits`,
  })
  pin!: string;
}
