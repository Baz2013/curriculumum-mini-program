# Assets 目录说明

此目录用于存放小程序的静态资源文件。

## 默认头像

由于微信小程序的限制，建议在此处放置一张默认的用户头像图片。

### 要求

- 文件名：`default-avatar.png`
- 尺寸：建议 200×200 px 或更大
- 格式：PNG（支持透明背景）或JPG
- 大小：尽量控制在 100KB 以内

### 使用方式

在代码中已经有对应的引用：

```javascript
// miniprogram/pages/profile/profile.wxml
<image 
  class="avatar" 
  src="{{userInfo.avatarUrl || '/assets/default-avatar.png'}}"
  mode="aspectFill"
></image>
```

如果不提供默认头像，当用户未设置头像时将会显示空白区域。

### 获取默认头像

你可以从以下几个来源获取合适的默认头像：

1. **自己绘制**：使用Photoshop、Figma等工具设计
2. **免费素材网站**：
   - Undraw.co
   - Icons8
   - Freepik
3. **简单文字头像**：可以用Canvas动态生成带有用户名字母的头像

### 示例

如果你不想放图片，也可以考虑使用纯色圆形代替：

```css
/* miniprogram/pages/profile/profile.wxss */
.avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #1890ff;
  color: white;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

然后修改 wxml：

```xml
<!-- 当没有头像时显示占位符 -->
<block wx:if="{{userInfo.avatarUrl}}">
  <image class="avatar" src="{{userInfo.avatarUrl}}" mode="aspectFill"></image>
</block>
<block wx:else>
  <view class="avatar-placeholder">学</view>
</block>