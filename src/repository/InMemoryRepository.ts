import fs from 'fs';
import path from 'path';

export class InMemoryRepository<T extends { id: string }> {
  private items: Map<string, T> = new Map();
  private filePath: string | null = null;

  constructor(filename?: string) {
    if (filename) {
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.filePath = path.join(dataDir, filename);
      this.loadFromFile();
    }
  }

  public save(item: T): T {
    this.items.set(item.id, item);
    this.persistToFile();
    return item;
  }

  public findById(id: string): T | null {
    return this.items.get(id) || null;
  }

  public findAll(): T[] {
    return Array.from(this.items.values());
  }

  public query(predicate: (item: T) => boolean): T[] {
    return this.findAll().filter(predicate);
  }

  public update(id: string, updates: Partial<T>): T {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Item with id ${id} not found.`);
    }
    const updated = { ...existing, ...updates };
    this.items.set(id, updated);
    this.persistToFile();
    return updated;
  }

  public delete(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      this.persistToFile();
    }
    return deleted;
  }

  public clear(): void {
    this.items.clear();
    this.persistToFile();
  }

  private persistToFile(): void {
    if (!this.filePath) return;
    try {
      const data = JSON.stringify(Array.from(this.items.values()), null, 2);
      fs.writeFileSync(this.filePath, data, 'utf-8');
    } catch (err) {
      console.error(`Failed to persist data to ${this.filePath}:`, err);
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      if (content) {
        const parsed: T[] = JSON.parse(content);
        for (const item of parsed) {
          this.items.set(item.id, item);
        }
      }
    } catch (err) {
      console.error(`Failed to load data from ${this.filePath}:`, err);
    }
  }
}
