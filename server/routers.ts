import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMonitoredProduct, deleteMonitoredProduct, getMonitoredProductById, getMonitoredProducts, updateMonitoredProduct } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    list: protectedProcedure.query(({ ctx }) => getMonitoredProducts(ctx.user.id)),
    
    add: protectedProcedure
      .input(
        z.object({
          productUrl: z.string().url(),
          userEmail: z.string().email(),
          checkIntervalMinutes: z.number().min(15).default(60),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createMonitoredProduct({
          userId: ctx.user.id,
          productUrl: input.productUrl,
          userEmail: input.userEmail,
          checkIntervalMinutes: input.checkIntervalMinutes,
          isActive: true,
        });
      }),
    
    update: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          checkIntervalMinutes: z.number().min(15).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new Error("Product not found");
        
        return updateMonitoredProduct(input.productId, ctx.user.id, {
          checkIntervalMinutes: input.checkIntervalMinutes,
          isActive: input.isActive,
        });
      }),
    
    delete: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getMonitoredProductById(input.productId, ctx.user.id);
        if (!product) throw new Error("Product not found");
        
        return deleteMonitoredProduct(input.productId, ctx.user.id);
      }),
    
    getById: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ ctx, input }) => getMonitoredProductById(input.productId, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
