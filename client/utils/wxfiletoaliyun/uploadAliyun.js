const env = require('./env.js'); 
//配置文件，在这里配置你的OSS keyId和KeySecret,timeout:87600;
//更好的做法是把这些信息放到服务器进行签名，防止信息泄露

const Base64 = require('./Base64.js');
//Base64,hmac,sha1,crypto相关算法
//参考这里https://github.com/peterhuang007/weixinFileToaliyun.git

require('./hmac.js');
require('./sha1.js');
const Crypto = require('./crypto.js');


const uploadFile = function (filePath, dir, successc, failc) {
  if (!filePath || filePath.length < 9) {
    wx.showModal({
      title: '文件错误',
      content: '请重试',
      showCancel: false,
    })
    return;
  }

  filePath = String(filePath)

  console.log('上传文件…', filePath, typeof filePath);
 
  //直接拿微信本地的名字当做传到服务器上的名字了，dir传的是images/，表示要传到这个目录下
  const aliyunFileKey = dir + filePath.replace('wxfile://', '').replace('http://', '');

  const aliyunServerURL = env.uploadImageUrl;//OSS地址，需要https
  const accessid = env.OSSAccessKeyId;
  const policyBase64 = getPolicyBase64();
  const signature = getSignature(policyBase64);//获取签名

  console.log('aliyunFileKey=', aliyunFileKey);
  console.log('aliyunServerURL', aliyunServerURL);

  wx.uploadFile({
    url: aliyunServerURL,
    filePath: filePath,
    name: 'file',//必须填file
    formData: {
      'key': aliyunFileKey,
      'policy': policyBase64,
      'OSSAccessKeyId': accessid,
      'signature': signature,
      'success_action_status': '200',
    },
    success: function (res) {
      console.info("uploadFile succ ", res)
      if (res.statusCode != 200) {
        failc(new Error('上传错误:' + JSON.stringify(res)))
        return;
      }
      console.log('上传文件成功', res)
      successc(aliyunFileKey);
    },
    fail: function (err) {
      err.wxaddinfo = aliyunServerURL;
      failc(err);
    },
  })
}

const getPolicyBase64 = function () {
  let date = new Date();
  date.setHours(date.getHours() + env.timeout);
  let srcT = date.toISOString();
  const policyText = {
    "expiration": srcT, //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了 
    "conditions": [
      ["content-length-range", 0, 5 * 1024 * 1024] // 设置上传文件的大小限制,5mb
    ]
  };

  const policyBase64 = Base64.encode(JSON.stringify(policyText));
  return policyBase64;
}

const getSignature = function (policyBase64) {
  const accesskey = env.AccessKeySecret;

  const bytes = Crypto.HMAC(Crypto.SHA1, policyBase64, accesskey, {
    asBytes: true
  });
  const signature = Crypto.util.bytesToBase64(bytes);

  return signature;
}

module.exports = uploadFile;