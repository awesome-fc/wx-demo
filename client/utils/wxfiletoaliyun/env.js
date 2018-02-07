// 将xxx替换成您的oss bucket地址
// 目前这边配置的您实际的ak，有安全风险，可以配置一个fc，获取临时ak
// 具体实现可以参考：https://yq.aliyun.com/articles/279124?spm=a2c4e.11155435.0.0.5b58de91sgjtuk
var fileHost = "https://xxx.oss-cn-shanghai.aliyuncs.com"
var config = {
  //aliyun OSS config
  uploadImageUrl: `${fileHost}`, //默认存在根目录，可根据需求改
  AccessKeySecret: '<your ak_secret>', 
  OSSAccessKeyId: '<<your ak_id>',
  timeout: 87600 //这个是上传文件时Policy的失效时间
};
module.exports = config