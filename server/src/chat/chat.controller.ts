import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from '@/chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('answer')
  async answer(
    @Body()
    body: {
      collection: string;
      question: string;
      top_k?: number;
      include?: string[];
    },
  ) {
    return this.chat.answer(body);
  }
}
