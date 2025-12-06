// Mid-Side Audio Processor
// Provides stereo manipulation through mid-side encoding/decoding

class MSProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            ['mode', 0, 0, 9, 'k-rate'],          // Processing mode selector
            ['width', 100, 0, 200, 'k-rate'],     // Stereo width percentage
            ['midGain', 0, -12, 12, 'k-rate'],    // Mid channel gain in dB
            ['sideGain', 0, -12, 12, 'k-rate'],   // Side channel gain in dB
            ['balance', 0, -100, 100, 'k-rate']   // L/R balance
        ].map(x => new Object({
            name: x[0],
            defaultValue: x[1],
            minValue: x[2],
            maxValue: x[3],
            automationRate: x[4]
        }))
    }

    constructor() {
        super()
    }

    // Convert dB to linear gain
    dbToGain(db) {
        return Math.pow(10, db / 20)
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0]
        const output = outputs[0]

        // Handle invalid input gracefully
        if (!input || input.length === 0) return true

        // Get parameters
        const mode = parameters.mode[0]
        const width = parameters.width[0] / 100
        const midGainDb = parameters.midGain[0]
        const sideGainDb = parameters.sideGain[0]
        const balance = parameters.balance[0] / 100

        // Convert dB to linear gain
        const midGainLinear = this.dbToGain(midGainDb)
        const sideGainLinear = this.dbToGain(sideGainDb)

        // Handle mono input - duplicate to both channels
        const leftInput = input[0] || []
        const rightInput = input[1] || input[0] || []
        const leftOutput = output[0] || []
        const rightOutput = output[1] || output[0] || []

        const blockSize = leftInput.length

        for (let i = 0; i < blockSize; i++) {
            const L = leftInput[i] || 0
            const R = rightInput[i] || 0

            // Calculate Mid (center/mono content) and Side (stereo difference)
            let mid = (L + R) * 0.5
            let side = (L - R) * 0.5

            // Apply gain adjustments
            mid *= midGainLinear
            side *= sideGainLinear

            let outL, outR

            switch (Math.floor(mode)) {
                case 0: // None (passthrough)
                    outL = L
                    outR = R
                    break

                case 1: // Left only (output left to both channels)
                    outL = L
                    outR = L
                    break

                case 2: // Right only (output right to both channels)
                    outL = R
                    outR = R
                    break

                case 3: // Mid only (center/mono content)
                    outL = mid
                    outR = mid
                    break

                case 4: // Side only (stereo difference)
                    outL = side
                    outR = -side
                    break

                case 5: // Stereo width control
                    outL = mid + side * width
                    outR = mid - side * width
                    break

                case 6: // Swap channels
                    outL = R
                    outR = L
                    break

                case 7: // Mono (collapse to mono)
                    const mono = (L + R) * 0.5
                    outL = mono
                    outR = mono
                    break

                case 8: // Reverse phase (invert one channel)
                    outL = L
                    outR = -R
                    break

                default: // Fallback to passthrough
                    outL = L
                    outR = R
            }

            // Apply L/R balance
            if (balance !== 0) {
                const balanceGainL = balance < 0 ? 1 : 1 - balance
                const balanceGainR = balance > 0 ? 1 : 1 + balance
                outL *= balanceGainL
                outR *= balanceGainR
            }

            // Write to output with safety checks
            if (leftOutput && i < leftOutput.length) {
                leftOutput[i] = outL
            }
            if (rightOutput && i < rightOutput.length) {
                rightOutput[i] = outR
            }
        }

        return true // Keep processor alive
    }
}

registerProcessor('ms-processor', MSProcessor)
