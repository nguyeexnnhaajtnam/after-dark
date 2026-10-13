import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { RoomsService } from './rooms.service';
import { GameEngine } from './game.engine';
import { ApiController } from './api.controller';
import { GameGateway } from './game.gateway';
@Module({imports:[ThrottlerModule.forRoot([{ttl:60000,limit:30}])],controllers:[ApiController],providers:[PrismaService,RoomsService,GameEngine,GameGateway,{provide:APP_GUARD,useClass:ThrottlerGuard}]})
export class AppModule{}
