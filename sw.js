// Service Worker: 修复 oss.top237.top 损坏的 MP3 音频
// 部分 OSS 文件头部混入了加密数据，浏览器 Audio 元素从头解码会失败
// star.top237.top 播放器用 Range 请求跳过了损坏前缀，我们在此模拟
const TRIM_BYTES = 3145728; // 跳过前 3MB（损坏的 ID3/加密数据区域）

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // 仅拦截 oss.top237.top 的 mp3 请求
    if (!url.hostname.endsWith('oss.top237.top')) return;
    if (!url.pathname.endsWith('.mp3') && !/\/assets\/[a-f0-9]{20,}$/.test(url.pathname)) return;

    event.respondWith(
        fetch(event.request.url, {
            headers: { 'Range': `bytes=${TRIM_BYTES}-` },
            referrerPolicy: 'no-referrer'
        }).then(response => {
            if (response.status === 206 || response.status === 200) {
                // 创建新响应，伪装成完整文件（200 OK）
                // 浏览器拿到干净 MPEG 帧就能正常解码
                return new Response(response.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Accept-Ranges': 'bytes',
                        'X-Audio-Fixed': 'sw-trimmed'
                    }
                });
            }
            return response;
        }).catch(() => {
            // 如果 fetch 失败（CORS），透传原始请求
            return fetch(event.request);
        })
    );
});
