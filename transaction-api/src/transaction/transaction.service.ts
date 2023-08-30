import { Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTransactionInput } from './dto/create-transaction.input';
import { TransactionStatus } from 'src/common/commonTypes';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
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
    return await this.transactionRepository.save(newTransaction);
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
