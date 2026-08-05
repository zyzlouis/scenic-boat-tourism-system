// utils/phone.js — 手机号绑定的共用逻辑
//
// 2026-08-05 起，手机号不再是支付的前置条件。
// 原设计在「点击支付」时检查手机号、没有就弹窗要授权、授权完再用
// setTimeout(1500) 自动续上支付流程——那 1.5 秒的无反馈窗口正是
// 2026-07-28 掉单事故的根因（用户以为没点上，又点了一次，
// 两条流程并发各申请一个商户单号，后者覆盖前者）。
//
// 现在改为：支付一条直路走完，在订单详情页引导绑定。
// 用户已经付完钱，绑定意愿更高，且不再打断任何交易流程。

/**
 * 查询当前用户是否已绑定手机号
 * 出错时一律返回 true（视为已绑定），避免因网络问题反复骚扰用户
 */
async function hasBoundPhone() {
  try {
    const res = await wx.cloud.callFunction({ name: 'getUserInfo' })
    const data = res && res.result && res.result.success ? res.result.data : null
    return !!(data && data.phone)
  } catch (error) {
    console.error('查询手机号绑定状态失败:', error)
    return true
  }
}

/**
 * 用授权回调拿到的 code 换手机号并写入用户记录
 * @returns {Promise<boolean>} 是否绑定成功
 */
async function bindPhone(code) {
  const res = await wx.cloud.callFunction({
    name: 'getPhoneNumber',
    data: { code }
  })
  return !!(res && res.result && res.result.success)
}

module.exports = {
  hasBoundPhone,
  bindPhone
}
