import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTransactionInput } from './dto/create-transaction.input';
import { TransactionStatus } from 'src/common/commonTypes';
import { ClientKafka } from '@nestjs/microservices';
import {
  TransactionCreatedEvent,
  TransactionValidatedEvent,
} from 'src/transactions.event';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @Inject('ANTI_FRAUD_SERVICE') private readonly afClient: ClientKafka,
  ) {}

  async getTransactions(): Promise<Transaction[]> {
    return await this.transactionRepository.find({ withDeleted: true });
  }

  async createTransaction(
    transaction: createTransactionInput,
  ): Promise<Transaction> {
    const newTransaction = new Transaction();
    newTransaction.accountExternalIdDebit = transaction.accountExternalIdDebit;
    newTransaction.accountExternalIdCredit =
      transaction.accountExternalIdCredit;
    newTransaction.transferType = transaction.transferType;
    newTransaction.value = transaction.value;
    const transactionCreated =
      await this.transactionRepository.save(newTransaction);
    this.afClient.emit(
      'transaction-created',
      new TransactionCreatedEvent(
        transactionCreated.id,
        transactionCreated.transferType,
        transactionCreated.value,
      ),
    );
    return await this.transactionRepository.save(newTransaction);
  }

  async handlerTransactionUpdatedStatus(
    transaction: TransactionValidatedEvent,
  ) {
    console.log('transaction Status Updated', transaction);
  }

  async findTransactionById(id: string): Promise<Transaction> {
    return await this.transactionRepository.findOne({ where: { id } });
  }

  async deleteTransaction(id: string): Promise<string> {
    const transaction = await this.findTransactionById(id);
    transaction.status = TransactionStatus.REJECTED;
    await this.transactionRepository.save(transaction);
    await this.transactionRepository
      .createQueryBuilder('t')
      .softDelete()
      .where('id = :id', { id })
      .execute();
    return transaction.id;
  }
}
