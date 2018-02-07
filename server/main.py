# coding=utf-8
from weixin import WXAPPAPI
from aip import AipSpeech
import uuid, json, base64
import os, sys, time, inspect
import logging
import json
import re
import oss2

filtrate = re.compile(u'[^\u4E00-\u9FA5A-Za-z0-9]') #过滤出口令中的 中文字,字母

# 微信小程序开发者相关配置信息
APP_ID = "填写您的ID"
APP_SECRET = "填写您的SECRET"


# 百度语音识别相关配置信息
BAIDU_APP_ID = '填写您的百度语音识别的运用ID'
BAIDU_API_KEY = '填写您的百度语音识别的运用API KEY'
BAIDU_SECRET_KEY = '填写您的百度语音识别的运用SECRET KEY'

baidu_client = AipSpeech(BAIDU_APP_ID, BAIDU_API_KEY, BAIDU_SECRET_KEY)

# 微信session缓存，如果有持续的请求，可以认为函数是常驻的
# 这边是演示， 函数请求到新的容器中，缓存无效，需要重新去微信服务器那边请求下
# https://help.aliyun.com/knowledge_detail/56103.html?spm=a2c4g.11186623.6.606.oAv7Fu#resource-reuse
# 如果对缓存要求很严格正确，可以考虑把微信服务器返回的session_key、openid 和自己生成的3rd session存储到阿里云表格存储ots中
# ots即使大量数据，查询也很快
SESSION_CACHE = {}


def get_file_content(filePath):
    with open(filePath, 'rb') as fp:
        return fp.read()

def get_openid_session(code):
    api = WXAPPAPI(appid=APP_ID, app_secret=APP_SECRET)
    try:
        session_info = api.exchange_code_for_session_key(code=code)
        # 获取session_info
        logging.info("get session_info from wechat server: {}".format(session_info))

        status = 200 if "errcode" not in session_info else 400

        resp_body = {'statusCode': status}

    except:
        resp_body = {'statusCode': 400}


    if status == 200:
        # 创建3_rd session
        thrid_session = str(uuid.uuid1())
        logging.info("create thrid_session: {}".format(thrid_session) )
        resp_body["session"] = thrid_session
        
        # 设置session的到期时间，这边设置为30min
        session_info["expire_time"] = time.time() + 1800

        SESSION_CACHE[thrid_session] = session_info

    return resp_body

def check_session(session):
    if session in SESSION_CACHE:
        if time.time() - SESSION_CACHE[session]["expire_time"] <= 0:
            resp_body = {'statusCode': 201, "leftValidity": SESSION_CACHE[session]["expire_time"] - time.time()}
        else:
            resp_body = {'statusCode': 401, "leftValidity": 0}
            SESSION_CACHE.pop(session, None)
    else:
        resp_body = {'statusCode': 401, "leftValidity": -1}

    return resp_body


def wx_auth(body_d):
    logging.info("wx_auth ing ....")
    if "code" in body_d: # 利用该登录状态的code从微信服务服务器获取openid和seeeion
        code = body_d["code"]
        resp_body = get_openid_session(code)

    elif "session" in body_d: # 直接利用本地session
        session = body_d["session"]
        resp_body = check_session(session)

    else:
        resp_body = {'statusCode': 500}

    return resp_body

def voice_recognition(body_d):
    logger = logging.getLogger()
    start_time = time.time()
    resp_body = {'statusCode': 500, "reason": "unknown error"}
    voice_name = body_d["voice_name"]
    voice_str = body_d["voice"]

    str_li = voice_str.split(',')
    voice_bytes = "".join([chr(int(item.strip())) for item in str_li])

    kouling  = body_d['kouling']
    if isinstance(kouling, str):
        kouling = kouling.decode('utf-8')

    kouling = filtrate.sub(r'',  kouling) #过滤除中文和英文字母所有字符
    kouling = kouling.encode('utf-8')

    print "decode time = {}".format(time.time() - start_time)

    
    pre = "/tmp/" + voice_name
    mp3_filename = pre + ".mp3"
    wav_filename = pre + ".wav"
    print 'write start %s' % mp3_filename


    part_stream = open(mp3_filename,'w')
    part_stream.write(voice_bytes)

    command = './ffmpeg -y -i {0}  {1}'.format(mp3_filename, wav_filename)
    os.system(command)

    print "change format time = {}".format(time.time() - start_time)

    # 识别本地文件
    r = baidu_client.asr(get_file_content(wav_filename), 'wav', 16000, {
        'lan': 'zh',
    })

    if r['err_no'] == 0:
        resp_body = {'statusCode': 200}
        text = r["result"][0].encode('utf-8')
        print "check voice text = ", text
        text = filtrate.sub(r'',  text.decode('utf-8')) #过滤除中文和英文字母所有字符
        resp_body['voice_text'] = text.encode('utf-8')
        resp_body['right'] = text == kouling
    else:
        resp_body["reason"] = json.dumps(r)
        logger.error("baidu voice recognition fail: {}".format(r))

    command = 'rm -rf /tmp/*.*'
    os.system(command)

    print "voice_recognition time = ", time.time() - start_time

    return resp_body


def handler(event, context):
    logger = logging.getLogger()
    evt = json.loads(event)
    body = base64.b64decode(evt['body'])
    body_d = json.loads(str(body))
    func_name = body_d["func"]

    session_valid = True
    
    # 除了认证函数，其他业务函数必须携带3rd session在这里进行校验
    # 如果进一步安全保证, 可以考虑在api网关校验session, 这个可以参考：
    # https://help.aliyun.com/document_detail/48019.html?spm=a2c4g.11174283.6.580.85OIiN
    if func_name != "wx_auth": 
        session = body_d.get("session")
        ret = check_session(session)
        if ret['statusCode'] != 201: # 返回401code将让客户端重新登录
            session_valid = False

    if session_valid:
        invkfunc = [obj for name, obj in inspect.getmembers(sys.modules[__name__]) 
                         if (inspect.isfunction(obj) and name == func_name)][0]

        resp_body = invkfunc(body_d)

    else:
        resp_body = {'statusCode': "401"}


    response = {
        'isBase64Encoded': False,
        'statusCode': 200,
        'headers': {
          "x-custom-header" : "x_wechat_entry"
      },
      'body': resp_body
    }

    print "handler response: ", response

    return response

