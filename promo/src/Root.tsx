import { Composition, Still } from 'remotion'
import { Promo, TOTAL_FRAMES } from './Promo'
import { Thumbnail } from './Thumbnail'

export const Root = () => (
    <>
        <Composition
            id="ChorusPromo"
            component={Promo}
            durationInFrames={TOTAL_FRAMES}
            fps={30}
            width={1920}
            height={1080}
        />
        <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    </>
)
