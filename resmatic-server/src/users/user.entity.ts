export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}

export type PublicUser = Omit<User, 'passwordHash'>;
