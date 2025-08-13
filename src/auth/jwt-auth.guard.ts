import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Placeholder implementation - replace with actual JWT validation
    // For now, always allow access for testing purposes
    return true;
  }
}