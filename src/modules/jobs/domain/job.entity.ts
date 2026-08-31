import { uuidv7 } from 'uuidv7';
import { JobStatus } from './job-status.enum';

export class Job {
  public readonly id: string;
  public readonly createdAt: Date;

  private _name: string;
  private _status: JobStatus;
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _error?: string;

  constructor(name: string) {
    this.id = uuidv7();
    this.createdAt = new Date();
    this._name = name;
    this._status = JobStatus.PENDING;
  }

  get name(): string | undefined {
    return this._name;
  }

  get status(): JobStatus {
    return this._status;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get error(): string | undefined {
    return this._error;
  }

  start(): void {
    if (this._status !== JobStatus.PENDING) {
      throw new Error(
        `Job "${this.id}" não pode ser iniciado com ${this._status}`,
      );
    }

    this._status = JobStatus.RUNNING;
    this._startedAt = new Date();
  }

  complete(): void {
    if (this._status !== JobStatus.RUNNING) {
      throw new Error(
        `Job "${this.id}" não pode ser completado com ${this._status}`,
      );
    }

    this._status = JobStatus.COMPLETED;
    this._completedAt = new Date();
  }

  fail(error: string): void {
    this._status = JobStatus.FAILED;
    this._error = error;
  }

  toJSON() {
    return {
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      id: this.id,
      name: this.name,
      status: this.status,
      startedAt: this.startedAt,
    };
  }
}
