//getHb.js
const util = require('../../../utils/util.js')
const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();
const app = getApp();
const uploadFile = require('../../../utils/wxfiletoaliyun/uploadAliyun.js');

Page({
  data: {
    userInfo: [],
    options: [],
    authRecordStatus: false,
    hidden: true,
  },
 
  onLoad: function (options) {
    var that = this;
    console.log(options)

    that.setData({
      options: options,
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

    try {
      var fc_session = wx.getStorageSync('fc_session')
      if (fc_session) {
        console.log("getHb get 3rd session from local: ", fc_session)
        wx.request({
          url: authUrl,
          data: {
            session: fc_session,
            func: "wx_auth"
          },
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          success: res => {
            console.info(res.data.statusCode)
            if (res.data.statusCode == 201) { //利用本地3rd session访问成功
              console.log("getHb get 3rd session from server session cache, left expired time = :", res.data.leftValidity)
            }
          }
        })
      }else {
        console.error("local read 3rd seesion null!")
        app.reLogin()
      }
    } catch (e) {
      console.error("local read 3rd seesion failure!")
    }

    wx.authorize({
      scope: 'scope.record',
      success() {
        console.log("录音授权成功");
        that.setData({
          authRecordStatus: true,
        })
        that.touchup()
      },
      fail() {
        console.log("第一次录音授权失败");
      }
    })
  },

  loadingChange: function () {
    this.setData({
      hidden: true
    })
  },

  touchdown: function () {
    var that = this
    console.log("开始录音")
    if (!that.data.authRecordStatus){
      app.showInfo("正在授权录音，请稍等...");
    }else{
      console.log("开始录音")
      that.getVoice()
    }
  },

  touchup: function(){
    var that = this;
    if (!that.data.authRecordStatus) {
      return
    }
    console.log("touchup 停止录音")
    recorderManager.stop();
  },

  // 获取录音
  getVoice: function () {
    var that = this;
    const options = {
      duration: 60000,//指定录音的时长，单位 ms
      sampleRate: 16000,//采样率
      numberOfChannels: 1,//录音通道数
      encodeBitRate: 96000,//编码码率
      format: 'mp3',//音频格式，有效值 aac/mp3
      frameSize: 32,//指定帧大小，单位 KB
    }
    var voice_name = this.uuidv4()
    var voiceBuff = ""
    //开始录音
    recorderManager.start(options);
    recorderManager.onStart(() => {
      console.log('recorder start')
    });
    recorderManager.onResume(() => {
      console.log('recorder resume')
    })
    recorderManager.onPause(() => {
      console.log('recorder pause')
    })
    recorderManager.onStop((res) => {
      console.log('recorderManager.onStop, 停止录音', res.tempFilePath)
      //that.uploadVoice(res.tempFilePath);
      this.setData({
        hidden: false
      })
      var that = this
      setTimeout(function () {
        that.setData({
          hidden: true
        })
      }, 3500)

    })
    recorderManager.onFrameRecorded((res) => {
      const { isLastFrame, frameBuffer } = res
      console.log('frameBuffer.byteLength', frameBuffer.byteLength, isLastFrame)
      var unit8_array = new Uint8Array(frameBuffer)
      var file_str = String(unit8_array)

      if(voiceBuff.length > 0){
        voiceBuff = voiceBuff + "," + file_str
      }else{
        voiceBuff = file_str
      }

      if(isLastFrame){
        console.log('upload voice and wait ecognition...')
        var authUrl = app.globalData.localApi + "/wxEntry"
        wx.request({
          url: authUrl,
          data: {
            func: "voice_recognition",
            voice: voiceBuff, 
            kouling: that.data.options.kouling,
            voice_name: voice_name,
            session: wx.getStorageSync('fc_session')
          },
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          success: res => {
            if (res.data.statusCode == 200) {
              if (res.data.right) {
                app.showInfo("恭喜你，获得赏金: " + String(that.data.options.Money));
              } else {
                app.showInfo("很遗憾，口令没读对, 你读的语音是: " + res.data.voice_text);
              }
            } else {
              if (res.data.statusCode == 401){
                app.showInfo("session过期，请重新录音");
                app.reLogin()
              }else{
                app.showInfo("没有检查出您的语音，请重新录音");
              }
            }
            this.setData({
              hidden: true
            })
          }
        })
        voiceBuff = ""
      }     
    })
    //错误回调
    recorderManager.onError((res) => {
      console.log(res);
    })
  },

  uuidv4: function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 上传语音到oss
  uploadVoice: function (tempFilePath) {
    var that = this;
    console.log("程序进入上传语音...");

    uploadFile(tempFilePath, "",
      function (res) {
        var end = new Date().getTime()
        console.log("上传语音成功", res)
      },
      function (res) {
        console.log("上传失败", res)
        //todo
      })

    // 测试播放下录下的语音
    // innerAudioContext.src = tempFilePath;
    // innerAudioContext.play()
  },
})
