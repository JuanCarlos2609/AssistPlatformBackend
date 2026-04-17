export class CreateUserDto {
  name: string;
  last_name: string;
  middle_name?: string;
  curp?: string;
  rfc?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  email_work?: string;
  password: string;
  privacy_notice?: boolean;
  biometric_id?: number | null;
  nss?: number;
}
