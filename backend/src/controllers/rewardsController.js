import { deleteReward, createReward, fulfillRedemption, listRewards, redeemReward } from '../services/rewardService.js';
import { redeemSchema, rewardCreateSchema } from '../utils/validation.js';

export async function createRewardController(req, res, next) {
  try {
    const data = rewardCreateSchema.parse(req.body);
    return res.status(201).json(await createReward(req.auth.parentId, data));
  } catch (error) {
    next(error);
  }
}

export async function listRewardsController(req, res, next) {
  try {
    if (req.auth.role === 'parent') {
      return res.json(await listRewards(req.auth.parentId));
    }
    return res.json(await listRewards(req.auth.parentId, req.auth.childId));
  } catch (error) {
    next(error);
  }
}

export async function redeemRewardController(req, res, next) {
  try {
    const data = redeemSchema.parse(req.body);
    return res.status(201).json(await redeemReward(req.auth.childId, data.rewardId));
  } catch (error) {
    next(error);
  }
}

export async function fulfillRedemptionController(req, res, next) {
  try {
    return res.json(await fulfillRedemption(req.auth.parentId, req.params.redemptionId));
  } catch (error) {
    next(error);
  }
}

export async function deleteRewardController(req, res, next) {
  try {
    return res.json(await deleteReward(req.auth.parentId, req.params.rewardId));
  } catch (error) {
    next(error);
  }
}
