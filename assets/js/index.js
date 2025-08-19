let changing = false;
let proxyList = ['pixiv.yukiryou.top'];
let currentProxyIndex = 0;
let maxRetries = proxyList.length;
let autoChangeTimer = null; // 定时器

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function fetchBG() {
  const params = new URLSearchParams({
    num: 1,
    tag: '百合|萝莉|少女',
    excludeAI: 1,
    r18: 2,
  });

  const apiUrl = `https://${proxyList[currentProxyIndex]}/setu/v2?${params}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'upstream-host': 'api.lolicon.app' },
    });
    if (!res.ok) throw new Error(`代理 ${proxyList[currentProxyIndex]} 无法访问，状态码：${res.status}`);

    let { data } = await res.json();

    // 根据屏幕比例过滤
    const { innerWidth, innerHeight } = window;
    const isPortrait = innerWidth / innerHeight <= 3 / 4;
    const filteredData = data.filter(v => {
      const { width, height } = v;
      let result = width >= height; // 横屏
      if (isPortrait) result = !result; // 竖屏时取竖图
      return result;
    });
    if (filteredData.length) data = filteredData;

    return data[0]; // 返回选中的图片信息
  } catch (err) {
    console.error(err.message);
    currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
    maxRetries--;
    if (maxRetries > 0) return fetchBG(); // 重试
    else throw new Error('所有代理服务器无法访问');
  }
}

async function changeBG() {
  const bgInfoA = document.getElementById('bg-info');
  const changeElem = document.getElementById('change');
  const bgElement = document.getElementById('bg');
  if (changing) return;
  changing = true;

  if (changeElem) changeElem.href = 'javascript:void(0)';
  bgInfoA.innerText = 'Loading~';

  try {
    const bgInfo = await fetchBG();

    // 替换域名
    let picUrl = bgInfo.urls.original;
    picUrl = picUrl.replace(/^https?:\/\/i\.pixiv\.re/, 'https://i.yukiryou.top');

    // 执行淡出
    bgElement.classList.remove("bg-fade-in");
    bgElement.classList.add("bg-fade-out");

    await new Promise(resolve => bgElement.addEventListener('animationend', resolve, { once: true }));

    // 切换图片并淡入
    bgElement.style.backgroundImage = `url("${picUrl}")`;
    bgElement.classList.remove("bg-fade-out");
    bgElement.classList.add("bg-fade-in");

    // 显示图片信息
    bgInfoA.innerText = bgInfo.title;
    bgInfoA.href = `https://www.pixiv.net/artworks/${bgInfo.pid}`;
  } catch (err) {
    console.error(err);
    bgInfoA.innerText = '加载失败，请稍后重试';
    await sleep(3000);
    await changeBG(); // 重试
  }

  changing = false;
  if (changeElem) changeElem.href = 'javascript:changeBG()';
}

// 自动切换逻辑
function startAutoChange(interval = 10000) {
  // 先立即换一次
  changeBG();

  // 开启定时器
  if (autoChangeTimer) clearInterval(autoChangeTimer);
  autoChangeTimer = setInterval(changeBG, interval);
}

function stopAutoChange() {
  if (autoChangeTimer) {
    clearInterval(autoChangeTimer);
    autoChangeTimer = null;
  }
}

// 页面加载完成后，开始自动切换
window.addEventListener("DOMContentLoaded", () => {
  startAutoChange(30000); // 每 30 秒换一张
});
