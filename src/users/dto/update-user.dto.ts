export class UpdateUserDto {
  name?: string;
  last_name?: string;
  middle_name?: string;
  curp?: string;
  rfc?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  nss?: number;
  role?: 'Admin' | 'User';
}
