import fs from 'fs';
import path from 'path';

export class MemoryService {
  private history: { role: 'user' | 'assistant', content: string }[] = [];
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'memory.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar memoria persistente');
      this.history = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.warn('⚠️ No se pudo guardar memoria');
    }
  }

  addUserMessage(message: string) {
    this.history.push({ role: 'user', content: message });
    this.trim();
    this.save();
  }

  addAssistantMessage(message: string) {
    this.history.push({ role: 'assistant', content: message });
    this.trim();
    this.save();
  }

  getLastUserMessages(limit: number = 3): string {
    return this.history
      .filter(m => m.role === 'user')
      .slice(-limit)
      .map(m => m.content)
      .join(' ');
  }

  buildContextualQuery(currentQuery: string): string {
    const previous = this.getLastUserMessages(2);
    return previous ? `${previous} ${currentQuery}` : currentQuery;
  }

  private trim(limit: number = 20) {
    if (this.history.length > limit) {
      this.history = this.history.slice(-limit);
    }
  }

  clear() {
    this.history = [];
    this.save();
  }
}