let bgUrl = null;
let changing = false;
let proxyList = [ 'fuck-ddos.o607th9p-285.workers.dev','fuck-cors.yuzusoft.life']; // 代理地址列表
let currentProxyIndex = 0; // 当前代理的索引
let maxRetries = proxyList.length; // 限制重试次数

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

async function fetchBG() {
  const params = new URLSearchParams({
    num: 10,
    proxy: proxyList[currentProxyIndex],
    tag: '萝莉|少女' && '御姐|百合',
    excludeAI: 1,
  });
  const apiUrl = `https://${proxyList[currentProxyIndex]}/setu/v2?${params}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'upstream-host': 'api.lolicon.app' },
    });
    if (!res.ok) {
      throw new Error(`代理 ${proxyList[currentProxyIndex]} 无法访问，状态码：${res.status}`);
    }

    let { data } = await res.json();

    // 根据屏幕比例过滤图片
    const { innerWidth, innerHeight } = window;
    const isPortrait = innerWidth / innerHeight <= 3 / 4;
    const filteredData = data.filter((v) => {
      const { width, height } = v;
      let result = width >= height; // 是否横屏
      if (isPortrait) result = !result;
      return result;
    });
    if (filteredData.length > 0) data = filteredData;

    const selectedPic = data[0];
    const picUrl = selectedPic.urls.original;

    const picRes = await fetch(picUrl, {
      headers: {
        'upstream-host': 'i.pximg.net',
        'real-referer': 'https://www.pixiv.net/',
      },
    });
    const imgType = picRes.headers.get('content-type');
    if (!imgType || !imgType.includes('image')) {
      throw new TypeError(`返回数据类型不正确 (${imgType})`);
    }

    return [selectedPic, await picRes.blob()];
  } catch (error) {
    console.error(error.message);
    currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
    maxRetries--;

    if (maxRetries > 0) {
      console.log(`切换到下一个代理: ${proxyList[currentProxyIndex]}`);
      return fetchBG(); // 递归调用
    } else {
      throw new Error('所有代理服务器都无法访问，请检查代理设置。');
    }
  }
}

async function changeBG() {
  /** @type {HTMLAnchorElement} */
  const bgInfoA = document.getElementById('bg-info');
  /** @type {HTMLAnchorElement} */
  const changeElem = document.getElementById('change');

  const task = async () => {
    if (bgUrl) URL.revokeObjectURL(bgUrl);

    const [bgInfo, bg] = await fetchBG();
    bgUrl = URL.createObjectURL(bg);

    // animation
    const bgElement = document.getElementById('bg');
    bgElement.style.animation = `bg-fade-out 1s cubic-bezier(0, 0, 0.2, 1)`;

    // wait animation
    await new Promise((resolve) => {
      bgElement.addEventListener('animationend', resolve, { once: true });
    });

    bgElement.style.backgroundImage = `url("${bgUrl}")`;
    bgElement.style.animation = `bg-fade-in 1s cubic-bezier(0, 0, 0.2, 1)`;

    // show pic info
    bgInfoA.innerText = bgInfo.title;
    bgInfoA.href = `https://www.pixiv.net/artworks/${bgInfo.pid}`;
  };

  if (changing) return;
  changing = true;

  // eslint-disable-next-line no-script-url
  changeElem.href = 'javascript:void(0)';
  bgInfoA.innerText = 'Loading~';

  try {
    await task();
  } catch (e) {
    console.error(e);
    bgInfoA.innerText = '加载失败，请稍后重试';
    await sleep(3 * 1000);
    await changeBG(); // 重试
  }

  changing = false;
  // eslint-disable-next-line no-script-url
  changeElem.href = 'javascript:changeBG()';
}
