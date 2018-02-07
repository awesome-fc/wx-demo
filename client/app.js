//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    var authUrl = this.globalData.localApi +  "/wxEntry"

    wx.checkSession({
      success: res => {
        //session 未过期，并且在本生命周期一直有效
        console.info("微信登录状态的未过期")
        try {
          var fc_session = wx.getStorageSync('fc_session')
          if (fc_session) {
            console.info("get 3rd session from local: ", fc_session)
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
                  console.info("get 3rd session from server session cache, left expired time = :", res.data.leftValidity)
                }
              },
              fail: res=> {
                // session过期或者其他原因导致不可用
                this.reLogin()
              }
            })
          }else{
            console.error("local read 3rd seesion null!")
            this.reLogin()
          }
        } catch (e) {
          console.error("local read 3rd seesion failure!")
        }

      },
      fail: res => {
        //登录态过期
        console.info("微信登录状态的过期")
        // 重新登录
        wx.login({
          success: res => {
            // 发送 res.code 到后台换取 openId, sessionKey, unionId
            console.info("wx login res code = ", res.code)
            if (res.code) {
              //发起网络请求
              wx.request({
                url: authUrl,
                data: {
                  code: res.code,
                  func: "wx_auth"
                },
                method: 'POST',
                header: {
                  'content-type': 'application/json'
                },
                success: res => {
                  console.log(res.data.statusCode)
                  if (res.data.statusCode == 200) {
                    console.log("get 3rd session from server:", res.data.session)
                    try {
                      wx.setStorageSync('fc_session', res.data.session)
                    } catch (e) {
                      console.error("local write 3rd seesion failure!")
                    }
                  }
                  if (res.data.statusCode == 201) { //利用本地session访问成功
                    console.log("session leftValidity = ", res.data.leftValidity)
                  }
                }
              })
            } else {
              console.log('获取用户登录态失败！' + res.errMsg)
            }
          }
        })
      }
    })

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo
            }
          })
        }
      }
    })
  },

  reLogin: function () {
    var authUrl = this.globalData.localApi + "/wxEntry"
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.info("wx login res code = ", res.code)
        if (res.code) {
          //发起网络请求
          wx.request({
            url: authUrl,
            data: {
              code: res.code,
              func: "wx_auth"
            },
            method: 'POST',
            header: {
              'content-type': 'application/json'
            },
            success: res => {
              console.log(res.data.statusCode)
              if (res.data.statusCode == 200) {
                console.log("get 3rd session from server:", res.data.session)
                try {
                  wx.setStorageSync('fc_session', res.data.session)
                } catch (e) {
                  console.error("local write 3rd seesion failure!")
                }
              }
            }
          })
        } else {
          console.log('获取用户登录态失败！' + res.errMsg)
        }
      }
    })
  },

  globalData: {
    userInfo: null, 
    localApi: "https://xxxxx.cn"  //改成自己的配置在api网关的域名
  },
  
  // 提示信息；
  showInfo: function (content) {
    wx.showModal({
      title: "提示信息",
      content: content,
      showCancel: false,
      success: res => {
      }
    })
  },
  // 提示信息TOast;
  showToast: function (title) {
    wx.showToast({
      title: title,
      duration: 1500,
    })
  },
})