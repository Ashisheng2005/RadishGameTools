// icon 测试脚本
const path = require('path');

try {
  // 直接加载原生模块
  const nativeModulePath = path.join(__dirname, '..', '..', 'native','build', 'Release', 'icon_thumbnail.node');
  console.log('尝试加载原生模块:', nativeModulePath);
  
  const nativeModule = require(nativeModulePath);
  console.log('✅ 原生模块加载成功');
  console.log('可用方法:', Object.keys(nativeModule).filter(k => typeof nativeModule[k] === 'function'));
  
  // 测试提取
  const testFile = "E:\\Microsoft VS Code\\Code.exe"; // 使用简单的系统文件测试
  const outputFile = 'E:\\RadishGameTools\\icos\\icon-test.png';
  
  console.log('\n测试文件:', testFile);
  console.log('输出文件:', outputFile);
  
  if (require('fs').existsSync(testFile)) {
    console.log('测试文件存在');
    
    try {
      const result = nativeModule.extractThumbnailToFile(testFile, outputFile, 256);
      console.log('提取结果:', result);
      
      if (require('fs').existsSync(outputFile)) {
        console.log('✅ 输出文件创建成功');
        console.log('文件大小:', require('fs').statSync(outputFile).size, '字节');
      } else {
        console.log('❌ 输出文件未创建');
      }
    } catch (error) {
      console.error('❌ 提取失败:', error.message);
      console.error('堆栈:', error.stack);
    }
  } else {
    console.log('❌ 测试文件不存在，尝试其他文件...');
    
    // 尝试其他常见文件
    const testFiles = [
      "E:\\Microsoft VS Code\\Code.exe",
      "E:\\galgamebag\\galapplicaiton\\[無碼] 天津罪（アマツツミ）\\cmvs32_CHS.exe",
      "E:\\galgamebag\\galapplicaiton\\交响乐之雨\\[交响乐之雨].SR_Cracked.exe",
      "E:\\galgamebag\\galapplicaiton\\片羽 ―An' call Belle―\\カタハネ ―An' call Belle―CHS.exe",
      "E:\\galgamebag\\死に逝く君、館に芽吹く憎悪\\[160729][バグシステム]死に逝く君、館に芽吹く憎悪 [汉化硬盘版]\\死に逝く君、館に芽吹く憎悪.exe"
    ];
    
    for (const file of testFiles) {
      if (require('fs').existsSync(file)) {
        console.log(`\n尝试文件: ${file}`);
        try {
          const result = nativeModule.extractThumbnailToFile(file, `./test_${Date.now()}.png`, 256);
          console.log('结果:', result);
          break;
        } catch (err) {
          console.log('失败:', err.message);
        }
      }
    }
  }
  
} catch (error) {
  console.error('❌ 原生模块加载失败:', error.message);
  console.error('完整错误:', error);
}