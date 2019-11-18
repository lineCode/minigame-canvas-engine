let doT = require('./dot.js');

const template = `
    <view class="container" id="main">
        <view class="rankList">
            <view class="header">
                <text class="headerItem headerItemCurr" value="{{= it.title }}"></text>
            </view>

            <scrollview class="list">
                {{~it.data :item:index}}
                    <view class="listItem">
                        <text class="listItemNum" value="{{= index + 1}}"></text>
                        <image class="listHeadImg" src="{{= item.avatarUrl }}"></image>
                        <view class="infoContainer">
                            <view class="nameContainer"> 
                                <text class="listName" value="{{= item.nickname}}"></text>
                            </view>
                            <view class="scoreContainer">
                                <image class="listStarImg" src="sub/UI_Icon_Rating.png"></image>
                                <text class="listName" value ="{{=item.starSum || 1}}"></text>
                            </view>
                        </view>

                        <image class="giftBtn" src="sub/Buffet_icon_GiftPlate.png"></image>
                    </view>
                {{~}}
            </scrollview>
        </view>
    </view>
`;

let tplFn = doT.template(template);

console.log(tplFn);
