package com.jouwprivacy.liquidglass

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Bridges the QmDeve Android liquid-glass view to React Native. Prop units match
 * the GlassCard tokens: corner radius / refraction in dp (converted to px here),
 * blur radius and dispersion raw, tint as a colour. `sourceViewId` is the React
 * node handle of the view to sample (bound as the glass's refraction source).
 */
class LiquidGlassModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LiquidGlass")

    View(LiquidGlassExpoView::class) {
      Name("LiquidGlassView")

      Prop("cornerRadius") { view: LiquidGlassExpoView, dp: Float ->
        view.setCornerRadiusDp(dp)
      }

      Prop("blurRadius") { view: LiquidGlassExpoView, radius: Float ->
        view.glass.setBlurRadius(radius)
      }

      Prop("refractionHeight") { view: LiquidGlassExpoView, dp: Float ->
        view.setRefractionHeightDp(dp)
      }

      Prop("refractionOffset") { view: LiquidGlassExpoView, dp: Float ->
        view.setRefractionOffsetDp(dp)
      }

      Prop("dispersion") { view: LiquidGlassExpoView, value: Float ->
        view.glass.setDispersion(value)
      }

      Prop("tint") { view: LiquidGlassExpoView, color: Double? ->
        view.applyTint(color)
      }

      Prop("sourceViewId") { view: LiquidGlassExpoView, id: Int? ->
        view.setSourceViewId(id)
      }
    }
  }
}
