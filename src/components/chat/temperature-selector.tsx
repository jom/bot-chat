import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface TemperatureSelectorProps {
  temperature: number
  setTemperature: (value: number) => void
}

export function TemperatureSelector({ temperature, setTemperature }: TemperatureSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="temperature" className="text-sm font-medium">Temperature:</Label>
      <Slider
          value={[temperature]}
          min={0}
          max={1.0}
          step={0.01}
          onValueChange={([value]) =>
            setTemperature(value)
          }
        />
      <span className="w-12 text-right text-sm">{temperature.toFixed(2)}</span>
    </div>
  )
} 