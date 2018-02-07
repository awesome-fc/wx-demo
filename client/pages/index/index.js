//index.js
//获取应用实例
const http = require("../../utils/util.js");
const app = getApp();
const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();
const uploadFile = require('../../utils/wxfiletoaliyun/uploadAliyun.js');

var tempFilePath;
Page({
  data: {
    userInfo:null,
    kouling:'谢谢老板', 
    Money:'',
    Number:'',
    answer:'',
    formId:'',
  },

  // page load 
  onLoad: function () {
    if (app.globalData.userInfo == null) {
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: app.globalData.userInfo,
          })
        }
      })
    }else{
      this.setData({
        userInfo: app.globalData.userInfo,
      })
    }
  },
 
  fromSubmit: function (e) {
    var formId= e.detail.formId
    console.log("deatail value = ", e.detail.value, "fromSubmit id = ", formId)
    this.setData({
      formId:formId,
    })
    this.iskouling();
  },

  fromReset:function(){
    console.log("from表单提交的更新")
  },

  iskouling: function () {
    var that = this;
    console.log("执行isKouling")
    if (that.data.kouling == '') {
      app.showInfo("请设置口令");
    } else if (that.data.Money == '') {
      app.showInfo("请输入赏金");
    } else if (that.data.Number == '') {
      app.showInfo("请设置红包个数");
    } else {
      that.prepay();
    }
  },

  prepay: function () {
    console.log("执行prepay")
    var that = this;
    console.log("formId = ", that.data.formId)

    try {
      var fc_session = wx.getStorageSync('fc_session')
      if (fc_session) {
        console.log("index.js get 3rd session from local: ", fc_session)

        // 正常的话，这边应该向服务端发起微信支付请求，支付成功以后，生成一个红包，然后跳转到可以转发的生成红包的页面
        // 也就是下面的Share页面，可能包括红包的金钱，红包的个数，口令，支付订单号等相关信息
        // 这边只是演示，假定是服务端支付成功跳转到成功生成口令红包的页面
        
        this.setData({
          orderno: "123456789",
        })

        console.log("hongbao info = ", that.data.Money, that.data.Number, that.data.kouling, that.data.orderno)

        wx.navigateTo({
          url: './Share/share?'
          + "Money=" + that.data.Money
          + "&Number=" + that.data.Number
          + "&kouling=" + that.data.kouling
          + "&orderno=" + that.data.orderno,
        })
       
      }
      else {
        console.error("index.js local read 3rd seesion null!")
        app.reLogin()
      }
    } catch (e) {
      console.error("local read 3rd seesion failure!")
    }
  },
  
  // 获取页面填入的值
  koulingInput:function(e){
    this.setData({
      kouling: e.detail.value,
    }) 
  },

  koulingInputBlur: function (e) {
    var conf = this.checkChinese(e.detail.value);
    console.log(conf);
    if (conf) {
      this.setData({
        kouling: e.detail.value,
      })
    } else {
      app.showInfo("请输入中文口令")
    }
  },

  MoneyInput:function(e){
    console.log(e.detail.value)
    var reg = new RegExp("^\\d+(\\.\\d{0,2})?$");
    if (!reg.test(e.detail.value)) {
      app.showInfo("请您输入正确的金额（只包含两位小数）")
    }else{
      this.setData({
        Money: e.detail.value,
      })
    }
  },

  NumberInput: function (e) {
    console.log(e.detail.value)
    this.setData({
      Number: e.detail.value,
    })
  },

  // 判断是否位汉字
  checkChinese: function (val) {
    var reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
    var str = reg.test(val);
    return str
  },
  
  // 跳转链接
  tomyRecord: function () {
    app.showInfo("跳转至我的记录页面, 这个只是展示作用");
  },
  
  totixian:function(){
    app.showInfo("跳转至余额提现页面, 这个只是展示作用");
  },

  toQuestion:function(){
    app.showInfo("跳转至我的常见问题页面, 这个只是展示作用");
  }
})
