import { HttpResponseInit } from '@azure/functions';
import { funcResult } from '../helpers';
import { BasicChainData, ChainFailure, ChainLink, ChainLinkResult, Transformer, TransformerResult } from './types';

const defaultErrors: Record<ChainLink<BasicChainData>['type'] | 'transformer', HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
  transformer: funcResult('InternalServerError', 'Transformation failed'),
};

const isTransformerSuccess = <TChainData extends BasicChainData>(result: TransformerResult<TChainData>): result is TChainData =>
  'triggerData' in result;

async function executeTransformer<TPreviousChainData extends BasicChainData, TChainData extends BasicChainData>(
  transformer: Transformer<TPreviousChainData, TChainData>,
  previousData: TPreviousChainData,
  transformerIndex: number,
  context: BasicChainData['context'],
): Promise<TChainData | ChainFailure> {
  try {
    const transformResult = await transformer.transform(previousData);
    if (!isTransformerSuccess(transformResult)) {
      context.error(`Link #${transformerIndex} (transformer) stopped the chain. Result: ${JSON.stringify(transformResult.error)}`);
      return { result: transformResult.error, linkIndex: transformerIndex, linkType: 'transformer' };
    }
    return transformResult;
  } catch (error) {
    const linkError = defaultErrors.transformer;
    context.error(`Link #${transformerIndex} (transformer) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
    return { result: linkError, linkIndex: transformerIndex, linkType: 'transformer' };
  }
}

async function executeLinks<TChainData extends BasicChainData>(
  links: ChainLink<TChainData>[],
  chainData: TChainData,
  indexOffset: number,
): Promise<TChainData | ChainFailure> {
  const currentData = chainData;
  const { context } = currentData;

  for (const [index, link] of links.entries()) {
    const globalIndex = indexOffset + index;
    try {
      switch (link.type) {
        case 'guard': {
          const linkResult: ChainLinkResult = await link.functor(currentData).check(currentData);
          if (linkResult !== true) {
            const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
            context.error(`Link #${globalIndex} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
            return { result: linkError, linkIndex: globalIndex, linkType: link.type };
          }
          break;
        }
        case 'inputBinding': {
          const linkResult: ChainLinkResult = await link.functor(currentData).set(context);
          if (linkResult !== true) {
            const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
            context.error(`Link #${globalIndex} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
            return { result: linkError, linkIndex: globalIndex, linkType: link.type };
          }
          break;
        }
      }
    } catch (error) {
      const linkError = defaultErrors[link.type];
      context.error(`Link #${globalIndex} (${link.type}) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
      return { result: linkError, linkIndex: globalIndex, linkType: link.type };
    }
  }

  return currentData;
}

const isChainFailure = (result: BasicChainData | ChainFailure): result is ChainFailure => !('triggerData' in result);

export { executeTransformer, executeLinks, isChainFailure };
