import { assert } from "chai";
import * as Bimonad from '../../../fp-bimonad-extended';
import * as EitherUnified from '../../../fp-either-unified';
import * as ResultUnified from '../../../fp-result-unified';

describe('Extended Bifunctor Monad Combinators', () => {
  it('should support generic bichain and chainLeft for Either', () => {
    const { Left, Right } = EitherUnified;
    const onLeft = (error: string) => Right(`Recovered: ${error}`);
    const onRight = (value: number) => Right(value * 2);
    assert.deepEqual(Bimonad.bichain(Bimonad.EitherBifunctorMonad, onLeft, onRight)(Left('error')), Right('Recovered: error'));
    assert.deepEqual(Bimonad.bichain(Bimonad.EitherBifunctorMonad, onLeft, onRight)(Right(5)), Right(10));
    const errorHandler = (error: string) => error.includes('timeout') ? Right('retry successful') : Left(error);
    assert.deepEqual(Bimonad.chainLeft(Bimonad.EitherBifunctorMonad, errorHandler)(Left('timeout error')), Right('retry successful'));
    assert.deepEqual(Bimonad.chainLeft(Bimonad.EitherBifunctorMonad, errorHandler)(Right(42)), Right(42));
  });

  it('should support Either-specific combinators', async () => {
    const { Left, Right } = EitherUnified;
    assert.deepEqual(Bimonad.bichainEither((e: string) => Right(`Recovered from ${e}`), (v: number) => Right(v * 3))(Left('network error')), Right('Recovered from network error'));
    assert.deepEqual(Bimonad.bichainEither((e: string) => Right(`Recovered from ${e}`), (v: number) => Right(v * 3))(Right(7)), Right(21));
    const retryHandler = (error: string) => error === 'timeout' ? Right('retry successful') : Left(error);
    assert.deepEqual(Bimonad.chainLeftEither(retryHandler)(Left('timeout')), Right('retry successful'));
    assert.deepEqual(Bimonad.chainLeftEither(retryHandler)(Right(100)), Right(100));
    const result = await Bimonad.matchMEither(async (e: string) => `Error logged: ${e}`, async (v: number) => `Processed: ${v}`)(Left('database error'));
    assert.equal(result, 'Error logged: database error');
    const result2 = await Bimonad.matchMEither(async (e: string) => `Error logged: ${e}`, async (v: number) => `Processed: ${v}`)(Right(42));
    assert.equal(result2, 'Processed: 42');
  });

  it('should support Result-specific combinators', async () => {
    const { Ok, Err } = ResultUnified;
    assert.deepEqual(Bimonad.bichainResult((v: string) => Ok(`Validated: ${v}`), (e: string) => Ok(`Recovered from ${e}`))(Err('validation error')), Ok('Recovered from validation error'));
    assert.deepEqual(Bimonad.bichainResult((v: string) => Ok(`Validated: ${v}`), (e: string) => Ok(`Recovered from ${e}`))(Ok('test data')), Ok('Validated: test data'));
    const errorHandler = (error: string) => error.includes('email') ? Ok('default@example.com') : Err(error);
    assert.deepEqual(Bimonad.chainErrResult(errorHandler)(Err('invalid email')), Ok('default@example.com'));
    assert.deepEqual(Bimonad.chainErrResult(errorHandler)(Ok('valid@example.com')), Ok('valid@example.com'));
    const result = await Bimonad.matchMResult(async (v: string) => `Success: ${v}`, async (e: string) => `Error: ${e}`)(Err('test error'));
    assert.strictEqual(result, 'Error: test error');
    const result2 = await Bimonad.matchMResult(async (v: string) => `Success: ${v}`, async (e: string) => `Error: ${e}`)(Ok('test data'));
    assert.strictEqual(result2, 'Success: test data');
  });
});
