// pages/index/Share/ShareHotMoney.js
var app = getApp();
const http = require("../../../utils/util.js");
const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();
var playVoiceInterval;
Page({
  data: { 
    userInfo:[],
    options:[],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options)
    this.setData({
      options:options,
    })
    
    if (app.globalData.userInfo == null) {
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: app.globalData.userInfo,
          })
        }
      })
    } else {
      this.setData({
        userInfo: app.globalData.userInfo,
      })
    }
  },

  /**
   * 用户点击右上角分享
   */

    onShareAppMessage: function (res) {
      var that = this;
      console.log("开始执行转发")
      return {
        title: "小程序红包",
        path: "/pages/index/getHb/getHb?Money=" + that.data.options.Money
        + "&Number=" + that.data.options.Number
        + "&kouling=" + that.data.options.kouling
        + "&orderno=" + that.data.options.orderno,
        success: function (res) {
          // app.showInfo("转发成功")
          console.log("转发成功", res)
        },
        fail: function (res) {
          app.showInfo("转发失败")
          console.log(res)
        }
      }
    }

})