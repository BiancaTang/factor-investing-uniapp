import pandas as pd
import numpy as np
import random
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
# 支持图表中中文展示
plt.rcParams['font.sans-serif'] = ['SimHei']  # 设置中文字体
plt.rcParams['axes.unicode_minus'] = False  # 解决负号'-'显示为方块的问题
# coding=utf-8
"""
Factor Trading Game
This module implements a factor trading game where players can invest based on various factors.
The game simulates multiple rounds of trading, allowing players to adjust their factor exposures and see the resulting returns.
"""


class FactorTradingGame:
    def __init__(self, num_rounds=8, player_nm=20, if_banker=False):
        """初始化游戏
        参数:
        num_rounds: 游戏回合数
        player_nm: 玩家数量
        """
        self.player_nm = player_nm  # 玩家数量
        self.if_banker = if_banker
        self.banker_nav0 = player_nm//3
        self.num_rounds = num_rounds
        self.current_round = 0  # 当前回合
        self.factor_unit_returns = {"size":0.05, 
                                    # "beta":0.01, 
                                    "momentum":0.02, 
                                    # "non_linear_size":0.01, 
                                    "book_to_price":0.01,
                                    # "earnings_yield":0.02, 
                                    "growth":0.03, 
                                    # "leverage":0.01, 
                                    # "liquidity":0.01, 
                                    "residual_volatility":0.01
                                    } # 单位偏离收益率
        self.factors = list(self.factor_unit_returns.keys())  # 因子列表
        self.factor_return = {}
        self.df_far_return = pd.DataFrame()  # 因子收益率
        self.player_performance = {i:{far_:0 for far_ in self.factors} for i in range(self.player_nm)}  # 记录各玩家表现
        self.df_expos = pd.DataFrame()
        self.df_all_perf = pd.DataFrame() 
    
    def read_factor_exposures_from_excel(self, excel_file):
        """从Excel文件读取因子配置"""
        # 读取Excel文件，特征列将空值填充为0
        # excel_file = r'E:\Warwick_WorkSpace\trading_game\factor_exposures.xlsx'  # 示例路径
        self.df_expos = pd.read_excel(excel_file)
        self.df_expos['Player_ID'] = self.df_expos['Player_ID'].astype(int)
        self.df_expos.loc[:, self.factors] = self.df_expos[self.factors].fillna(0)

        # ===================== 【关键修改：每轮先清零所有因子暴露】 =====================
        # 这一步让本地版和API版逻辑完全一致
        for i in range(self.player_nm):
            for factor in self.factors:
                self.player_performance[i][factor] = 0

        # 遍历每一行，获取玩家ID和投资组合（兼容部分小组未提交）
        for i in range(self.player_nm):
            if i in list(self.df_expos["Player_ID"]):
                row = self.df_expos.loc[self.df_expos['Player_ID']==int(i)].iloc[0]
                player_id = row["Player_ID"]
                exposures = {factor: row[factor] for factor in self.factors}
            else:
                player_id = i
                exposures = {factor: 0 for factor in self.factors}
            self.player_performance[player_id].update(exposures)
            if self.current_round == 1:
                if self.if_banker and player_id == 0:
                    self.player_performance[player_id].update({"nav": self.banker_nav0})
                else:
                    self.player_performance[player_id].update({"nav": 1.0})

    def macro_economic_factors(self):
        ## ------------------------------------------
        pass

    def generate_factor_returns(self):
        """生成因子收益率"""
        # 基于各玩家净值加权计算因子暴露均值
        df_perf = pd.DataFrame.from_dict(self.player_performance, orient='index')
        for factor in self.factors:
            df_perf[factor] = df_perf[factor].fillna(0)
            wgt_exposure = (df_perf[factor] * df_perf['nav']).sum() / df_perf['nav'].sum()
            # 生成因子收益率
            factor_ret = wgt_exposure * self.factor_unit_returns[factor] / 10
            self.factor_return.update({factor: factor_ret})
        # 将因子收益率存入DataFrame
        df_far_r_ut = pd.DataFrame.from_dict(self.factor_return, orient='index').T
        df_far_r_ut['round'] = self.current_round
        self.df_far_return = pd.concat([self.df_far_return, df_far_r_ut], ignore_index=True)
        return self.factor_return
    
    # def calculate_player_returns(self):
    #     """计算各玩家的回报，传统APT模型"""
    #     df_tmp = self.df_expos.copy()
    #     for factor in self.factors:
    #         df_tmp[factor] = df_tmp[factor].fillna(0)
    #         # 计算每个玩家的因子收益
    #         df_tmp[factor] = df_tmp[factor] * self.factor_return[factor]
    #     df_tmp['total_return'] = df_tmp[self.factors].sum(axis=1)
    #     self.df_expos['total_return'] = df_tmp['total_return']
    #     # 更新玩家净值
    #     for _, row in self.df_expos.iterrows():
    #         player_id = row["Player_ID"]
    #         total_return = row['total_return']
    #         if player_id in self.player_performance:
    #             # 更新净值
    #             current_nav = self.player_performance[player_id].get("nav", 1.0)
    #             new_nav = current_nav * (1 + total_return)
    #             self.player_performance[player_id]["nav"] = new_nav
    #     df_perf = pd.DataFrame.from_dict(self.player_performance, orient='index').reset_index()
    #     df_perf.rename(columns={'index': 'Player_ID'}, inplace=True)
    #     df_perf['round'] = self.current_round
    #     self.df_all_perf = pd.concat([self.df_all_perf, df_perf], ignore_index=True)

    def calculate_player_returns(self):
        """计算各玩家的回报，传统APT模型"""
        df_perf = pd.DataFrame.from_dict(self.player_performance, orient='index').reset_index()
        df_perf.rename(columns={'index': 'Player_ID'}, inplace=True)
        df_perf['round'] = self.current_round
        for factor in self.factors:
            df_perf[factor] = df_perf[factor].fillna(0)
            # 计算每个玩家的因子收益
            df_perf[factor + '_return'] = df_perf[factor] * self.factor_return[factor]
        # 计算每个玩家的总收益、更新净值
        df_perf['total_return'] = df_perf[[f + '_return' for f in self.factors]].sum(axis=1)
        df_perf['nav'] = df_perf['nav'] * (df_perf['total_return'] + 1)
        # 更新self.player_performance中的净值
        for _, row in df_perf.iterrows():
            player_id = row['Player_ID']
            if player_id in self.player_performance:
                self.player_performance[player_id]['nav'] = row['nav']
        # 更新玩家表现
        self.df_all_perf = pd.concat([self.df_all_perf, df_perf], ignore_index=True)

    def run_round(self):
        """运行一回合游戏"""
        print(f"\n===== 回合 {self.current_round} =====")
        # 1. 输入Excel文件路径
        excel_file = input("请输入因子配置的Excel文件路径: ")
        self.read_factor_exposures_from_excel(excel_file)
        
        # 2. 生成因子收益率
        factor_returns = self.generate_factor_returns()
        print("\n本回合因子收益率:")
        for factor, ret in factor_returns.items():
            print(f"{factor}: {ret:.2%}")
        
        # 3. 计算玩家回报
        self.calculate_player_returns()
        
        # 4. 显示玩家净值曲线、因子归因及因子收益率累积曲线
        print("\n本回合玩家净值:")
        print(self.player_performance)
        plt.figure(figsize=(12, 12))

        plt.subplot(2, 1, 1)
        for player_id in self.player_performance:
            if self.if_banker and player_id == 0:
                continue
            df_user_ut = self.df_all_perf.loc[self.df_all_perf['Player_ID'] == player_id][['nav','round']]
            recent_nav = df_user_ut['nav'].iloc[-1]
            plt.plot(df_user_ut['round'], df_user_ut['nav'], marker='o', label=f'玩家 {player_id}:{recent_nav:.2f}')
        plt.xticks(df_user_ut['round'])
        plt.title('玩家净值曲线')
        plt.xlabel('回合')
        plt.ylabel('净值')
        plt.grid()
        plt.legend(loc='upper left')
        plt.subplot(2, 1, 2)
        df_user_ut = self.df_all_perf.loc[self.df_all_perf['Player_ID'] == 0][['nav','round']].sort_values(by='round',ascending=True)
        df_user_ut['nav'] = df_user_ut['nav'] / df_user_ut['nav'].iloc[0]
        recent_nav = df_user_ut['nav'].iloc[-1]
        plt.plot(df_user_ut['round'], df_user_ut['nav'], marker='o', label=f'玩家 0:{recent_nav:.2f}')
        plt.xticks(df_user_ut['round'])
        plt.title('玩家净值曲线')
        plt.xlabel('回合')
        plt.ylabel('净值')
        plt.grid()
        plt.legend(loc='upper left')
        plt.savefig(f'graph_output/player_nav_{self.current_round}.png')
        plt.show()
    
        print("\n更新各玩家收益归因分布：")
        # 自适应按照玩家数量调整图表大小
        # 每个玩家占据一个子图
        num_players = len(self.player_performance)
        rows = (num_players + 4) // 7 + 2
        cols = min(num_players, 7)
        fig = plt.figure(figsize=(5 * cols, 4 * rows))
        plt.rcParams['font.size'] = 16
        gs = gridspec.GridSpec(rows, cols)

        for i, player_id in enumerate(self.player_performance):
            df_user_ut = self.df_all_perf.loc[self.df_all_perf['Player_ID'] == player_id][[f + '_return' for f in self.factors] + ['round']]
            df_user_ut = df_user_ut.set_index('round').sort_index()
            ax = fig.add_subplot(gs[i // cols, i % cols])
            ax.plot(df_user_ut.index.astype(str), df_user_ut[[f + '_return' for f in self.factors]], marker='o', label=[f for f in self.factors])
            plt.axhline(y=0, color='r', linestyle='--')
            ax.set_title(f'玩家 {player_id} 收益归因')
            ax.set_xlabel('回合')
            ax.set_ylabel('收益率')
            ax.legend(loc='upper left', framealpha=0.3)
            ax.grid()
        
        ax_last = fig.add_subplot(gs[-2:, :])
        df_far_r_show = self.df_far_return.set_index('round').sort_index()
        df_far_r_show = df_far_r_show[self.factors].cumsum()  # 累积收益率
        ax_last.plot(df_far_r_show.index.astype(str), df_far_r_show[self.factors], marker='o')
        ax_last.grid()
        ax_last.set_title('因子收益率累积曲线\n注：单期因子收益率上行，意味着“正向配置能赚钱”，反之同理')
        ax_last.set_xlabel('回合')
        ax_last.set_ylabel('累积收益率')
        ax_last.legend(df_far_r_show.columns, loc='upper left')

        plt.tight_layout()
        plt.savefig(f'graph_output/player_returns_contribution_{self.current_round}.png')
        plt.show()

    def run_game(self):
        """运行完整游戏"""
        self.current_round = 1
        
        for _ in range(self.num_rounds):
            self.run_round()
            self.current_round += 1
        
        # # 游戏结束，显示最终结果
        # print("\n===== 游戏结束 =====")
        # print("最终净值排名:")
        # navs = []
        # for player_id in self.player_performance:
        #     final_nav = self.player_performance[player_id]["nav"][-1]
        #     navs.append((player_id, final_nav))
        
        # # 按净值排序
        # navs.sort(key=lambda x: x[1], reverse=True)
        # for i, (player_id, nav) in enumerate(navs):
        #     print(f"{i+1}. {player_id}: {nav:.2f}")
        
        # # 显示各回合因子收益率
        # print("\n各回合因子收益率:")
        # for round_num, returns in self.factor_returns.items():
        #     print(f"\n回合 {round_num}:")
        #     for factor, ret in returns.items():
        #         print(f"{factor}: {ret:.2%}")

if __name__ == "__main__":
    # 创建并运行游戏
    game = FactorTradingGame(num_rounds=4, player_nm=3, if_banker=True)
    game.run_game()